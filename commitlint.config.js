export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    // Dependabot titles read "chore(deps): Bump x from a to b".
    'subject-case': [2, 'never', ['upper-case', 'pascal-case', 'start-case']],
  },
};
