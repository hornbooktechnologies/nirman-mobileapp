import authEn from './locales/en/auth.json';
import commonEn from './locales/en/common.json';
import errorsEn from './locales/en/errors.json';
import homeEn from './locales/en/home.json';
import membersEn from './locales/en/members.json';
import navigationEn from './locales/en/navigation.json';
import projectsEn from './locales/en/projects.json';
import teamEn from './locales/en/team.json';
import workersEn from './locales/en/workers.json';
import authGu from './locales/gu/auth.json';
import commonGu from './locales/gu/common.json';
import errorsGu from './locales/gu/errors.json';
import homeGu from './locales/gu/home.json';
import membersGu from './locales/gu/members.json';
import navigationGu from './locales/gu/navigation.json';
import projectsGu from './locales/gu/projects.json';
import teamGu from './locales/gu/team.json';
import workersGu from './locales/gu/workers.json';
import authHi from './locales/hi/auth.json';
import commonHi from './locales/hi/common.json';
import errorsHi from './locales/hi/errors.json';
import homeHi from './locales/hi/home.json';
import membersHi from './locales/hi/members.json';
import navigationHi from './locales/hi/navigation.json';
import projectsHi from './locales/hi/projects.json';
import teamHi from './locales/hi/team.json';
import workersHi from './locales/hi/workers.json';

export const resources = {
  en: { common: commonEn, auth: authEn, navigation: navigationEn, errors: errorsEn, home: homeEn, projects: projectsEn, team: teamEn, members: membersEn, workers: workersEn },
  hi: { common: commonHi, auth: authHi, navigation: navigationHi, errors: errorsHi, home: homeHi, projects: projectsHi, team: teamHi, members: membersHi, workers: workersHi },
  gu: { common: commonGu, auth: authGu, navigation: navigationGu, errors: errorsGu, home: homeGu, projects: projectsGu, team: teamGu, members: membersGu, workers: workersGu },
} as const;

export const namespaces = ['common', 'auth', 'navigation', 'errors', 'home', 'projects', 'team', 'members', 'workers'] as const;
