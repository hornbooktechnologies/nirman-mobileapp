import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { ATTENDANCE_STATUSES, type AttendanceStatus } from '@nirman-app/shared';

import {
    AppIcon,
    Button,
    Card,
    CompactScreenHeader,
    EmptyState,
    GradientScreen,
    Input,
    LoadingState,
    SyncStatus,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { exportAttendanceCsv, fetchAttendance, saveAttendance } from './services';
import type { AttendanceEntry, MobileAttendanceRecord } from './types';
import { fetchProjectWorkers } from '../workers/services';
import type { ProjectWorkerRosterItem } from '../workers/types';

const today = () => {
    const now = new Date();
    const utc = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return utc.toISOString().slice(0, 10);
};

const currentTime = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(11, 16);
};

function formatDateForInput(date: Date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

const timeValuePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const toTimeValue = (value: string | null | undefined) => {
    if (!value) return '';
    const timeValue = /^(\d{2}:\d{2})(?::\d{2})?$/.exec(value);
    return timeValue ? timeValue[1] : value;
};

const timeToSeconds = (value: string | null | undefined) => {
    if (!value) return null;
    const [hours, minutes, seconds = '0'] = value.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
};

const statusLabels: Record<AttendanceStatus, string> = {
    PRESENT: 'Present',
    HALF_DAY: 'Half day',
    ABSENT: 'Absent',
    HOLIDAY: 'Holiday',
};
const statusTones: Record<AttendanceStatus, { backgroundColor: string; color: string }> = {
    PRESENT: { backgroundColor: mobileTheme.color.status.success.background, color: mobileTheme.color.status.success.foreground },
    HALF_DAY: { backgroundColor: mobileTheme.color.status.warning.background, color: mobileTheme.color.status.warning.foreground },
    ABSENT: { backgroundColor: mobileTheme.color.status.danger.background, color: mobileTheme.color.status.danger.foreground },
    HOLIDAY: { backgroundColor: mobileTheme.color.status.info.background, color: mobileTheme.color.status.info.foreground },
};

function makeEntry(assignmentId: string, record?: MobileAttendanceRecord): AttendanceEntry {
    return {
        workerAssignmentId: assignmentId,
        status: record?.status ?? 'PRESENT',
        checkIn: record?.checkIn ?? null,
        checkOut: record?.checkOut ?? null,
        notes: record?.notes ?? null,
    };
}

function isDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}

export function AttendanceScreen() {
    const { refreshSession, session, signOut } = useSession();
    const activeProject = getActiveProject(session);
    const permissions = getActiveProjectPermissions(session);
    const organizationId = session?.activeOrganization?.id ?? null;
    const projectId = activeProject?.id ?? null;
    const canMark = permissions.includes('attendance:mark');
    const canExport = permissions.includes('attendance:export');
    const [date, setDate] = useState(today());
    const [defaultTime] = useState(currentTime);
    const [search, setSearch] = useState('');
    const [workers, setWorkers] = useState<ProjectWorkerRosterItem[]>([]);
    const [records, setRecords] = useState<MobileAttendanceRecord[]>([]);
    const [entries, setEntries] = useState<Record<string, AttendanceEntry>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');
    const [syncTone, setSyncTone] = useState<'online' | 'attention'>('online');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const load = useCallback(async () => {
        if (!session?.accessToken || !organizationId || !projectId || !isDate(date)) return;
        setIsLoading(true);
        setError('');
        try {
            const [rosterResponse, attendanceResponse] = await Promise.all([
                fetchProjectWorkers(organizationId, projectId, session.accessToken),
                fetchAttendance(organizationId, projectId, date, session.accessToken),
            ]);
            setWorkers(rosterResponse.data);
            setRecords(attendanceResponse);
            const existing = new Map(attendanceResponse.map((record) => [record.workerAssignmentId, record]));
            setEntries(Object.fromEntries(rosterResponse.data.map((worker) => [
                worker.currentAssignment.id,
                makeEntry(worker.currentAssignment.id, existing.get(worker.currentAssignment.id)),
            ])));
            setSyncTone('online');
        } catch (loadError) {
            if (loadError instanceof ApiRequestError && loadError.status === 401) {
                await signOut();
                return;
            }
            if (loadError instanceof ApiRequestError && loadError.status === 403) {
                setError('Attendance access is no longer available. Refreshing access.');
                await refreshSession().catch(() => undefined);
            } else {
                setError(loadError instanceof Error ? loadError.message : 'Attendance is unavailable.');
            }
            setSyncTone('attention');
        } finally {
            setIsLoading(false);
        }
    }, [date, organizationId, projectId, refreshSession, session?.accessToken, signOut]);

    useEffect(() => {
        void load();
    }, [load]);

    const visibleWorkers = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return workers.filter((worker) => !needle || worker.name.toLowerCase().includes(needle) || worker.workerCode.toLowerCase().includes(needle) || worker.trade.toLowerCase().includes(needle));
    }, [search, workers]);

    function updateEntry(assignmentId: string, patch: Partial<AttendanceEntry>) {
        setEntries((current) => ({ ...current, [assignmentId]: { ...current[assignmentId], ...patch } }));
    }

    function useDisplayedTime(assignmentId: string, field: 'checkIn' | 'checkOut') {
        setEntries((current) => {
            const entry = current[assignmentId] ?? makeEntry(assignmentId);
            if (entry[field]) return current;
            return { ...current, [assignmentId]: { ...entry, [field]: defaultTime } };
        });
    }

    function handleDateValueChange(event: DateTimePickerEvent, selectedDate?: Date) {
        setShowDatePicker(false);
        if (!selectedDate) return;
        setDate(formatDateForInput(selectedDate));
    }

    function markAllPresent() {
        setEntries((current) => Object.fromEntries(Object.entries(current).map(([id, entry]) => [id, { ...entry, status: 'PRESENT' }])));
    }

    async function save() {
        if (!organizationId || !projectId || !isDate(date)) {
            Alert.alert('Check attendance date', 'Use the date format YYYY-MM-DD.');
            return;
        }
        const invalidTimeEntry = Object.values(entries).find((entry) =>
            (entry.checkIn && !timeValuePattern.test(entry.checkIn)) ||
            (entry.checkOut && !timeValuePattern.test(entry.checkOut)),
        );
        if (invalidTimeEntry) {
            Alert.alert('Check attendance time', 'Use HH:mm format, for example 09:30.');
            return;
        }
        const invalidRangeEntry = Object.values(entries).find((entry) => {
            const checkIn = timeToSeconds(entry.checkIn);
            const checkOut = timeToSeconds(entry.checkOut);
            return checkIn !== null && checkOut !== null && checkOut < checkIn;
        });
        if (invalidRangeEntry) {
            Alert.alert('Check attendance time', 'Check-out time cannot be before check-in time.');
            return;
        }
        setIsSaving(true);
        try {
            await saveAttendance(organizationId, projectId, date, Object.values(entries), session!.accessToken);
            setSyncTone('online');
            Alert.alert('Attendance saved', `Attendance saved for ${date}.`);
            await load();
        } catch (saveError) {
            setSyncTone('attention');
            Alert.alert('Attendance not saved', saveError instanceof Error ? saveError.message : 'Try again when connected.');
        } finally {
            setIsSaving(false);
        }
    }

    async function exportAttendance() {
        if (!organizationId || !projectId || !isDate(date) || !session?.accessToken) {
            Alert.alert('Check attendance date', 'Use the date format YYYY-MM-DD.');
            return;
        }
        setIsExporting(true);
        try {
            const csv = await exportAttendanceCsv(organizationId, projectId, date, session.accessToken);
            await Share.share({
                title: `Attendance ${date}`,
                message: csv,
            });
        } catch (exportError) {
            Alert.alert('Attendance export failed', exportError instanceof Error ? exportError.message : 'Try again when connected.');
        } finally {
            setIsExporting(false);
        }
    }

    return (
        <GradientScreen footer={<CustomerTabBar activeKey="attendance" />} scroll={false}>
            <CompactScreenHeader title="Attendance" subtitle={activeProject?.name ?? 'Choose a project to mark attendance'} />
            <SyncStatus tone={syncTone} label={syncTone === 'online' ? 'Connected · All saved' : 'Needs attention · Check connection'} />
            <View style={styles.toolbar}>
                <View style={styles.dateField}>
                    <Text style={styles.fieldLabel}>DATE</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="Select attendance date" style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.dateText}>{date}</Text>
                        <AppIcon name="calendar-range" size={mobileTheme.icon.md} color={mobileTheme.color.text.muted} />
                    </Pressable>
                    {showDatePicker ? (
                        <DateTimePicker
                            value={isDate(date) ? new Date(`${date}T12:00:00`) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={handleDateValueChange}
                            maximumDate={new Date()}
                        />
                    ) : null}
                </View>
                <View style={styles.searchField}>
                    <Text style={styles.fieldLabel}>SEARCH</Text>
                    <Input accessibilityLabel="Search workers" value={search} onChangeText={setSearch} placeholder="Name, code or trade" style={styles.searchInput} />
                </View>
            </View>
            {canMark ? <Button label="Mark all present" leadingIcon="check-circle-outline" variant="secondary" onPress={markAllPresent} /> : null}
            {canExport ? <Button label={isExporting ? 'Exporting attendance' : 'Export attendance'} leadingIcon="download-outline" variant="secondary" disabled={isExporting} onPress={() => void exportAttendance()} /> : null}
            {error ? <Card><Text style={styles.error}>{error}</Text><Button label="Refresh access" variant="outline" onPress={() => void load()} /></Card> : null}
            {isLoading ? <LoadingState label="Loading attendance" /> : !activeProject || !projectId ? <EmptyState title="No project selected" description="Choose an accessible project before opening Attendance." /> : !visibleWorkers.length ? <EmptyState title="No assigned workers" description="Assign workers to this project before marking attendance." /> : (
                <FlatList
                    data={visibleWorkers}
                    keyExtractor={(worker) => worker.currentAssignment.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const assignmentId = item.currentAssignment.id;
                        const entry = entries[assignmentId] ?? makeEntry(assignmentId);
                        const tone = statusTones[entry.status];
                        return (
                            <Card style={styles.workerCard}>
                                <View style={styles.workerHeader}>
                                    <View style={styles.workerIdentity}>
                                        <View style={styles.workerAvatar}><Text style={styles.workerAvatarText}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
                                        <View style={styles.workerCopy}><Text style={styles.workerName}>{item.name}</Text><Text style={styles.workerMeta}>{item.workerCode} · {item.trade}</Text></View>
                                    </View>
                                    <AppIcon name="account-hard-hat-outline" size={mobileTheme.icon.md} color={mobileTheme.color.text.brand} />
                                </View>
                                <View style={styles.statusGrid}>
                                    {ATTENDANCE_STATUSES.map((status) => <Pressable key={status} accessibilityRole="radio" accessibilityState={{ selected: entry.status === status }} disabled={!canMark} onPress={() => updateEntry(assignmentId, { status })} style={[styles.statusButton, { backgroundColor: entry.status === status ? statusTones[status].backgroundColor : mobileTheme.color.surface.raised }, entry.status === status && styles.statusButtonSelected]}><Text style={[styles.statusLabel, { color: entry.status === status ? statusTones[status].color : mobileTheme.color.text.muted }]}>{statusLabels[status]}</Text></Pressable>)}
                                </View>
                                <View style={styles.timeRow}>
                                    <View style={styles.timeField}><Text style={styles.fieldLabel}>CHECK IN</Text><Input editable={canMark} value={toTimeValue(entry.checkIn) || defaultTime} onFocus={() => useDisplayedTime(assignmentId, 'checkIn')} onChangeText={(value) => updateEntry(assignmentId, { checkIn: value || null })} placeholder="HH:mm" autoCapitalize="none" keyboardType="numbers-and-punctuation" style={styles.inlineInput} /></View>
                                    <View style={styles.timeField}><Text style={styles.fieldLabel}>CHECK OUT</Text><Input editable={canMark} value={toTimeValue(entry.checkOut) || defaultTime} onFocus={() => useDisplayedTime(assignmentId, 'checkOut')} onChangeText={(value) => updateEntry(assignmentId, { checkOut: value || null })} placeholder="HH:mm" autoCapitalize="none" keyboardType="numbers-and-punctuation" style={styles.inlineInput} /></View>
                                </View>
                                <Input editable={canMark} value={entry.notes ?? ''} onChangeText={(value) => updateEntry(assignmentId, { notes: value || null })} placeholder="Optional note" style={styles.noteInput} />
                            </Card>
                        );
                    }}
                />
            )}
            {canMark && visibleWorkers.length ? <Button label={isSaving ? 'Saving attendance' : `Save ${Object.keys(entries).length} workers`} disabled={isSaving} onPress={() => void save()} /> : null}
            {!canMark && permissions.includes('attendance:read') ? <Text style={styles.readOnly}>Read-only attendance access. An authorised project member must save changes.</Text> : null}
        </GradientScreen>
    );
}

const styles = StyleSheet.create({
    toolbar: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
    dateField: { flex: 0.85, gap: mobileTheme.spacing[1] },
    searchField: { flex: 1.35, gap: mobileTheme.spacing[1] },
    dateButton: {
        alignItems: 'center',
        backgroundColor: mobileTheme.component.field.background,
        borderColor: mobileTheme.component.field.border,
        borderRadius: mobileTheme.component.field.radius,
        borderWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: mobileTheme.component.field.height,
        paddingHorizontal: mobileTheme.spacing[4],
    },
    dateText: { ...mobileText.body, color: mobileTheme.color.text.primary, fontFamily: 'Manrope_700Bold' },
    searchInput: { width: '100%' },
    fieldLabel: { ...mobileText.caption, color: mobileTheme.color.text.muted, fontFamily: 'Manrope_700Bold', letterSpacing: mobileTheme.typography.letterSpacing.caps },
    listContent: { gap: mobileTheme.spacing[4], paddingBottom: mobileTheme.spacing[3] },
    workerCard: { gap: mobileTheme.spacing[4], padding: mobileTheme.spacing[4] },
    workerHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    workerIdentity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
    workerAvatar: { alignItems: 'center', backgroundColor: mobileTheme.color.brand.primary, borderRadius: mobileTheme.radius.full, height: 42, justifyContent: 'center', width: 42 },
    workerAvatarText: { color: mobileTheme.color.text.inverse, fontFamily: 'Manrope_800ExtraBold', fontSize: 18 },
    workerCopy: { flex: 1, gap: mobileTheme.spacing[1] },
    workerName: { ...mobileText.body, color: mobileTheme.color.text.primary, fontFamily: 'Manrope_700Bold' },
    workerMeta: { ...mobileText.caption, color: mobileTheme.color.text.muted },
    statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
    statusButton: { borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.radius.full, borderWidth: 1, minHeight: 42, paddingHorizontal: mobileTheme.spacing[3], alignItems: 'center', justifyContent: 'center' },
    statusButtonSelected: { borderColor: mobileTheme.color.border.accent, borderWidth: 2 },
    statusLabel: { ...mobileText.caption, fontFamily: 'Manrope_700Bold' },
    timeRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
    timeField: { flex: 1, gap: mobileTheme.spacing[1] },
    inlineInput: { width: '100%' },
    noteInput: { width: '100%' },
    error: { ...mobileText.body, color: mobileTheme.color.status.danger.foreground, marginBottom: mobileTheme.spacing[3] },
    readOnly: { ...mobileText.caption, color: mobileTheme.color.text.muted, textAlign: 'center' },
});
