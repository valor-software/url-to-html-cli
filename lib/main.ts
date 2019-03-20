import chalk from 'chalk';
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');

import Commands from './commands';

const commands = new Commands();

function main() {
  return new Promise(async (res) => {
    const options = await inquirer.prompt([{
      name: 'option',
      type: 'list',
      message: '',
      choices: [
        {name: 'Manage commands', value: 0},
        {name: 'Scrap a new site', value: 1},
        {name: 'Serve', value: 2},
        {name: 'Deploy to gh-pages', value: 3},
        {name: 'Use a saved preset', value: 4},
        {name: 'Exit', value: 5}
      ],
      default: 2,
    }]);

    switch (options.option) {
      case 0:
        await commands.manageSites();
        break;
      case 1:
        await commands.grabSite();
        break;
      case 2:
        await commands.serveSite();
        break;
      case 3:
        await commands.deployToGHPages();
        break;
      case 4:
        await commands.usePreset();
        break;
      case 5:
      default:
        process.exit(0);
    }

    res();
  });
}

(async() => {
  clear();
  console.log(chalk.yellow(figlet.textSync('Scrapper', { horizontalLayout: 'full' })));

  while(true) {
    try {
      await main();
    } catch (e) {
      console.log(chalk.red(chalk.bold(e)));
      process.exit(0);
    }
  }
})();
