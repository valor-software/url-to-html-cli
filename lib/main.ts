import chalk from 'chalk';
const clear = require('clear');
const figlet = require('figlet');
const inquirer = require('inquirer');

// import FileManager from './file-manager';
import Scrapper from './scrapper';
import FileManagerCommands from './file-manager-commands';

// const fManager = new FileManager();
// const scrapper = new Scrapper(fManager);
const fCommands= new FileManagerCommands();

// process.on('SIGTERM', () => {
//   console.log('\n\n\n\nEXIT!!!', );
// })
//
// process.on('SIGINT', () => {
//   console.log('\n\n\n\nEXIT!!!', );
// })

// process.on('exit', () => {
//   console.log('\n\n\n\nEXIT MAIN!!!', );
// })
//
// process.on('message', (meg) => {
//   console.log('\n\n\n\nMSG!!!', );
// })

// saver.createSiteStructure('temp').then(async aa => {

function main() {
  return new Promise(async (res) => {
    const options = await inquirer.prompt([{
      name: 'option',
      type: 'list',
      message: '',
      choices: [
        {name: 'Manage commands', value: 0},
        {name: 'Scrap a new site', value: 1},
        {name:'Serve', value: 2},
        {name:'Exit', value: 3}
      ],
      default: 2,
    }]);

    switch (options.option) {
      case 0:
        await fCommands.manageSites();
        break;
    //   case 1:
    //     const command = await commandsOptions.selectSavedCommand();
    //     if (command === 'cancel') {
    //       console.log(chalk.yellow('Canceled'));
    //
    //       return;
    //     }
    //     if (command) {
    //       performer.runCommand(command, true);
    //     }
    //     break;
      case 1:
        await fCommands.grabPage();
        break;
      case 2:
        await fCommands.serveSite();
        break;
    //   case 3:
      default:
        process.exit(0);
    }

    res();
  });

}

(async() => {
  clear();
  console.log(
    chalk.yellow(chalk.bold(
      figlet.textSync('Scrapper', { horizontalLayout: 'full' })
    ))
  );

  // await isInstalled();

  while(true) {
    try {
      console.log('\n');

      await main();
      console.log('\n\nIN MAIN');

    } catch (e) {
      console.log(chalk.red(chalk.bold(e)));
      process.exit(0);

    }

  }
  // fCommands.manageSites();
  // await fManager.clear('temp');
  // await fManager.createSiteStructure('temp');
  // await scrapper.getPageHTML('https://valor-grab.webflow.io/');
  // await scrapper.getPageHTML('https://valor-grab.webflow.io/about')
})()
