const promisify = require('util').promisify;
const ghPages = require('gh-pages');

import { spawn } from 'child_process';

const ms = promisify(spawn);
const Spinner = require('cli-spinner').Spinner;
const inquirer = require('inquirer');

import chalk from 'chalk';

import FileManager from './file-manager'
import Scrapper from './scrapper';
import Loader from './loader';


export default class FileManagerCommands {
  private fileManager = new FileManager();
  private loader = new Loader(this.fileManager);

  async manageSites() {
    // return new Promise(async (res, rej) => {
      const list = await this.fileManager.getList();

      const options = await inquirer.prompt([{
        name: 'folders',
        type: 'checkbox',
        message: 'Select items to remove',
        choices: list
          .map(key => {
            return {
              value: key,
              name: key
            }
          })
          .concat([{value: 'clear', name: 'Clear all'}])
          .concat([{value: 'cancel', name: 'Cancel'}])
      }]);

      if (options.folders.includes('cancel')) {
        console.log(chalk.yellow('Canceled'));
        return Promise.resolve();
      }
      if (options.folders.includes('clear')) {
        const confirm = await inquirer.prompt([{
          name: 'confirm',
          type: 'confirm',
          message: 'Remove all saved commands'
        }]);

        if (confirm) {
          return Promise.resolve(this.fileManager.clearBatch(list));
        }
      }

      return Promise.resolve(this.fileManager.clearBatch(options.folders));
  }

  serveSite() {
    return new Promise(async (res, rej) => {
      const list = await this.fileManager.getList();

      const options = await inquirer.prompt([{
        name: 'folders',
        type: 'checkbox',
        message: 'Select items to remove',
        choices: list
          .map(key => {
            return {
              value: key,
              name: key
            }
          })
          .concat([{value: 'cancel', name: 'Cancel'}])
      }]);

      if (options.folders.includes('cancel')) {
        console.log(chalk.yellow('Canceled'));
        return res();
      }

  // try {
    const aa = spawn('node', ['./dist/lib/server.js', options.folders]);
      //
      // aa.on('SIGTERM', () => {
      //   console.log('\n\n\n\nEXIT!!!', );
      // })
      //
      // aa.on('SIGINT', () => {
      //   console.log('\n\n\n\nEXIT!!!', );
      // })
      //
      // aa.on('exit', () => {
      //   console.log('\n\n\n\nEXIT MAIN!!!', );
      // })
      //
      // aa.on('message', (meg) => {
      //   console.log('\n\n\n\nMSG!!!', );
      // })

    aa.stdout.on('data', (data) => {
      console.log(data.toString());

    })
  //
    aa.stderr.on('data', (data) => {
      console.log(data.toString());
    });
  // } catch(e) {
  //   console.log('IN CATCH');
  //
  // } finally {
  //   console.log('IN FINALLY', );
  //
  // }

    });
  }

  async grabPage() {
    const answers = await inquirer.prompt([{
      name: 'folder',
      type: 'input',
      message: 'Folder ',
      validate: function (value) {
        if (!value || value === '') {
          return ('You need to provide a word');
        } else {
          return true;
        }
      }
    }, {
      name: 'url',
      type: 'input',
      message: 'Specify a original URL? ',
      // default: 'https://dplguru-parse.webflow.io',
      default: 'https://valor.webflow.io',
      validate: function (url) {
        if (!url || url === '') {
          // || !url.match(new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi))) {
          return ('You need to provide a URL address');
        } else {
          return true;
        }
      }
    }, {
      name: 'host',
      type: 'input',
      message: 'Specify a URL for host inst? ',
      default: 'http://localhost:3000',
      // default: 'https://valor-grab.webflow.io',
      validate: function (url) {
        if (!url || url === '') {
          // || !url.match(new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi))) {
          return ('You need to provide a URL address');
        } else {
          return true;
        }
      }
    }]);

    return new Promise(async (res, rej) => {
      console.log(chalk.green(chalk.bold('Preparing files structure\n')));
      await this.fileManager.createSiteStructure(answers.folder);
      console.log(chalk.green(chalk.bold('Start parsing\n')));
      const scrapper = new Scrapper(answers.url, answers.host, this.fileManager, this.loader);

      let pages = [{
        page: answers.url,
        isProcessed: false
      }];

      while(true) {
        const current = getUnprocessedUrl(pages);

        if (!current) {
          break;
        }

        const currentUrl = current.page;

        const spinner = new Spinner({text: `Parsing: ${currentUrl} %s`});
        spinner.setSpinnerString(27);
        spinner.start();
        let newpages = await scrapper.getPageHTML(currentUrl, answers.folder);

        newpages = newpages.reduce((list, item) => {
          if (list.indexOf(item) === -1) {
            list.push(item);
          }
          return list;
        }, []);

        pages.find(page => page.page === currentUrl).isProcessed = true;
        pages = pages.concat(
          newpages
            .filter(page => {
              // const ff = pages.find(p => p.page === page);
              // console.log('ff', page, ff);
              
              return (pages.findIndex(p => p.page === page)) === -1;
            })
            .map(page => {

              return {
                page,
                isProcessed: false
              }
            }));

        spinner.stop(true);
        console.log(currentUrl + chalk.green(' done'));
      }
      console.log(chalk.green(chalk.bold('Parsing complete. Uploading resources\n')));

      await this.loader.loadResources();
      res();
    });
  }

  async deployToGHPages() {
    const answers = await inquirer.prompt([{
      name: 'folder',
      type: 'input',
      message: 'Folder ',
      validate: (value: string) => {
        if (!value || value === '') {
          return ('You need to provide a word');
        }
        return true;
      }
    }, {
      name: 'repo',
      type: 'input',
      message: 'Specify a repository to deploy ',
      default: 'git@github.com:VS-work/VS-work.github.io.git',
      validate: (url: string) => {
        if (!url || url === '') {
          return ('You need to provide a URL address');
        }
        return true;
      }
    }, {
      name: 'branch',
      type: 'input',
      message: 'Specify a branch ',
      default: 'gh-pages'
    }]);

    const spinner = new Spinner('Deploying...');
    spinner.start();

    await ghPages.publish(answers.folder, {
      branch: answers.branch,
      repo: answers.repo
    });

    spinner.stop(true);

    return Promise.resolve();
  }
}

function getUnprocessedUrl(pages) {
  return pages.find(p => !p.isProcessed);
}
