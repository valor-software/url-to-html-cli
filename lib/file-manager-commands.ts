import { spawn } from 'child_process';

const ghPages = require('gh-pages');
const Spinner = require('cli-spinner').Spinner;
const inquirer = require('inquirer');
import chalk from 'chalk';

import FileManager from './file-manager'
import Scrapper from './scrapper';
import Loader from './loader';
import { removeEndSlash } from './utils';


export default class FileManagerCommands {
  private fileManager = new FileManager();
  private loader: Loader;

  async manageSites() {
      let list = await this.fileManager.getList();
      list = list.filter(name => name !== '.keep');

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
      let list = await this.fileManager.getList();
      list = list.filter(name => name !== '.keep');

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

    const aa = spawn('node', ['./dist/lib/server.js', options.folders]);

    aa.stdout.on('data', (data) => {
      console.log(data.toString());

    });
    aa.stderr.on('data', (data) => {
      console.log(data.toString());
    });

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
      validate: function (url) {
        if (!url || url === '') {
          // || !url.match(new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi))) {
          return ('You need to provide a URL address');
        } else {
          return true;
        }
      }
    }]);
    answers.url = removeEndSlash(answers.url);
    answers.host = removeEndSlash(answers.host);

    return new Promise(async (res, rej) => {
      console.log(chalk.green(chalk.bold('Preparing files structure\n')));
      await this.fileManager.createSiteStructure(answers.folder);
      console.log(chalk.green(chalk.bold('Start parsing\n')));
      this.loader = new Loader(this.fileManager, answers.folder, answers.url, answers.host)
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
        let newpages = await scrapper.getPageHTML(currentUrl, answers.folder, answers.url);

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

      console.log(chalk.green(chalk.bold('Uploading complete. Analyzing CSS files\n')));

      const cssFilesList = await this.fileManager.getFolderContent(`${answers.folder}/assets/css`);

      await this.loader.processCssFiles(cssFilesList, answers);
      await this.loader.loadResources();

      console.log(chalk.green(chalk.bold('Scrapping complete\n')));

      res();
    });
  }

  async deployToGHPages() {
    let list = await this.fileManager.getList();
    list = list.filter(name => name !== '.keep');

    const answers = await inquirer.prompt([{
      name: 'folder',
      type: 'list',
      message: 'Select items to remove',
      choices: list
        .map(key => {
          return {
            value: `./save/${key}`,
            name: key
          }
        })
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
