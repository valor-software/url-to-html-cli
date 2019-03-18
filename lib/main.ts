import chalk from 'chalk';
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');

import Scrapper from './scrapper';
import FileManagerCommands from './file-manager-commands';

const fCommands = new FileManagerCommands();

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
        {name: 'Exit', value: 4}
      ],
      default: 2,
    }]);

    switch (options.option) {
      case 0:
        await fCommands.manageSites();
        break;
      case 1:
        await fCommands.grabPage();
        break;
      case 2:
        await fCommands.serveSite();
        break;
      case 3:
        await fCommands.deployToGHPages();
        break;
      case 4:
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
