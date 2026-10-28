import { resolve } from 'node:path';

export function assertUnitReport(report, projects, root = process.cwd()) {
  if (report.success === false || report.numFailedTests > 0 || report.numFailedTestSuites > 0) throw Error('Unit report contains failures');
  const counts = Object.fromEntries(projects.map(name => [name, 0]));
  for (const file of report.testResults ?? []) {
    const path = file.name.replaceAll('\\', '/');
    const project = projects.find(name => path.startsWith(resolve(root, name === 'engineering' ? 'tests/engineering' : `packages/${name}/test`).replaceAll('\\', '/') + '/'));
    if (!project) throw Error(`Unexpected test file ${file.name}`);
    if (file.status === 'failed') throw Error(`Failed test module ${file.name}`);
    for (const test of file.assertionResults ?? []) {
      if (test.status !== 'passed') throw Error(`${project}: non-passing test ${test.title ?? test.status}`);
      counts[project]++;
    }
  }
  for (const project of projects) if (!counts[project]) throw Error(`${project}: no executed passing tests`);
  return counts;
}
