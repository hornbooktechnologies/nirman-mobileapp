import authEn from './locales/en/auth.json';
import commonEn from './locales/en/common.json';
import errorsEn from './locales/en/errors.json';
import homeEn from './locales/en/home.json';
import membersEn from './locales/en/members.json';
import navigationEn from './locales/en/navigation.json';
import projectsEn from './locales/en/projects.json';
import teamEn from './locales/en/team.json';
import workersEn from './locales/en/workers.json';
import attendanceEn from './locales/en/attendance.json';
import calendarEn from './locales/en/calendar.json';
import wagesEn from './locales/en/wages.json';
import salesEn from './locales/en/sales.json';
import kharchiEn from './locales/en/kharchi.json';
import materialsEn from './locales/en/materials.json';
import expensesEn from './locales/en/expenses.json';
import progressEn from './locales/en/progress.json';
import authGu from './locales/gu/auth.json';
import commonGu from './locales/gu/common.json';
import errorsGu from './locales/gu/errors.json';
import homeGu from './locales/gu/home.json';
import membersGu from './locales/gu/members.json';
import navigationGu from './locales/gu/navigation.json';
import projectsGu from './locales/gu/projects.json';
import teamGu from './locales/gu/team.json';
import workersGu from './locales/gu/workers.json';
import attendanceGu from './locales/gu/attendance.json';
import calendarGu from './locales/gu/calendar.json';
import wagesGu from './locales/gu/wages.json';
import salesGu from './locales/gu/sales.json';
import kharchiGu from './locales/gu/kharchi.json';
import materialsGu from './locales/gu/materials.json';
import expensesGu from './locales/gu/expenses.json';
import progressGu from './locales/gu/progress.json';
import authHi from './locales/hi/auth.json';
import commonHi from './locales/hi/common.json';
import errorsHi from './locales/hi/errors.json';
import homeHi from './locales/hi/home.json';
import membersHi from './locales/hi/members.json';
import navigationHi from './locales/hi/navigation.json';
import projectsHi from './locales/hi/projects.json';
import teamHi from './locales/hi/team.json';
import workersHi from './locales/hi/workers.json';
import attendanceHi from './locales/hi/attendance.json';
import calendarHi from './locales/hi/calendar.json';
import wagesHi from './locales/hi/wages.json';
import salesHi from './locales/hi/sales.json';
import kharchiHi from './locales/hi/kharchi.json';
import materialsHi from './locales/hi/materials.json';
import expensesHi from './locales/hi/expenses.json';
import progressHi from './locales/hi/progress.json';

export const resources = {
  en: { common: commonEn, auth: authEn, navigation: navigationEn, errors: errorsEn, home: homeEn, projects: projectsEn, team: teamEn, members: membersEn, workers: workersEn, attendance: attendanceEn, calendar: calendarEn, wages: wagesEn, sales: salesEn, kharchi: kharchiEn, materials: materialsEn, expenses: expensesEn, progress: progressEn },
  hi: { common: commonHi, auth: authHi, navigation: navigationHi, errors: errorsHi, home: homeHi, projects: projectsHi, team: teamHi, members: membersHi, workers: workersHi, attendance: attendanceHi, calendar: calendarHi, wages: wagesHi, sales: salesHi, kharchi: kharchiHi, materials: materialsHi, expenses: expensesHi, progress: progressHi },
  gu: { common: commonGu, auth: authGu, navigation: navigationGu, errors: errorsGu, home: homeGu, projects: projectsGu, team: teamGu, members: membersGu, workers: workersGu, attendance: attendanceGu, calendar: calendarGu, wages: wagesGu, sales: salesGu, kharchi: kharchiGu, materials: materialsGu, expenses: expensesGu, progress: progressGu },
} as const;

export const namespaces = ['common', 'auth', 'navigation', 'errors', 'home', 'projects', 'team', 'members', 'workers', 'attendance', 'calendar', 'wages', 'sales', 'kharchi', 'materials', 'expenses', 'progress'] as const;
