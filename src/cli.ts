import { prepareData } from './data.js';
import { runBaseline } from './baseline.js';
import { scoreAll } from './score.js';
import { runAgent } from './agent.js';

const cmd = process.argv[2];

const main = async () => {
  switch (cmd) {
    case 'prepare-data':
      prepareData();
      break;
    case 'baseline':
      await runBaseline();
      break;
    case 'agent':
      await runAgent(process.argv[3] ?? 'agent');
      break;
    case 'score':
      scoreAll();
      break;
    default:
      console.error(`unknown command: ${cmd ?? '(none)'}`);
      console.error('usage: tsx src/cli.ts <prepare-data|baseline|agent|score|report>');
      process.exit(1);
  }
};

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
