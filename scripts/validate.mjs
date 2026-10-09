import gscan from 'gscan';
for (const version of ['v5', 'v6']) {
  const result = await gscan.check(process.cwd(), { checkVersion: version });
  gscan.format(result, { checkVersion: version });
  const errors = result.results?.error ?? [];
  const warnings = result.results?.warning ?? [];
  console.log(`Ghost ${version}: ${errors.length} errors, ${warnings.length} warnings.`);
  if (errors.length || warnings.length) {
    console.log(JSON.stringify({ errors, warnings }, null, 2));
    process.exitCode = 1;
  }
}
