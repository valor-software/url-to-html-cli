import { spawn } from 'child_process';

const inquirer = require('inquirer');
import chalk from 'chalk';

import FileManager from './file-manager'
import Scrapper from './scrapper';
import Loader from './loader';
import { removeEndSlash, removeStartSlash } from './utils';
import { Publisher } from './publisher';
import { postProcessors } from './postprocessors';

export default class Commands {
  private fileManager = new FileManager();

  async manageSites() {
    let list = await this.fileManager.getList();
    list = list.filter(name => name !== 'presets.json');

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
    return new Promise(async (res) => {
      let list = await this.fileManager.getList();
      list = list.filter(name => name !== 'presets.json');

      const options = await inquirer.prompt([{
        name: 'folders',
        type: 'list',
        message: 'Select folder to serve',
        validate: function (value) {
          if (!value || value === '') {
            return ('You should choose');
          } else {
            return true;
          }
        },
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

      const process = spawn('node', ['./dist/lib/server.js', options.folders]);

      process.stdout.on('data', (data) => {
        console.log(data.toString());

      });
      process.stderr.on('data', (data) => {
        console.log(data.toString());
      });

    });
  }

  async grabSite() {
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
      message: 'Specify an original URL ',
      // default: 'http://hf-productions-design.webflow.io/',
      // default: 'http://ngtalks.io/',
      // default: 'https://valor.webflow.io',
      default: 'https://table-p.webflow.io',
      validate: function (url) {
        if (!url || url === '') {
          // || !url.match(new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi))) {
          return ('You need to provide a URL address');
        } else {
          return true;
        }
      }
    }, {
      name: 'sitemap',
      type: 'input',
      message: 'Path to sitemap(optional, can be left empty) '
    }, {
      name: 'host',
      type: 'input',
      message: 'Specify a URL for host inst ',
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
    answers.sitemap = removeStartSlash(answers.sitemap);

    return new Promise(async (res, rej) => {
      console.log(chalk.green(chalk.bold('Preparing files structure\n')));
      await this.fileManager.createSiteStructure(answers.folder);
      console.log(chalk.green(chalk.bold('Start parsing\n')));
      const loader = new Loader(this.fileManager, answers.folder, answers.url, answers.host);
      const scrapper = new Scrapper(this.fileManager, loader);

      await scrapper.scrap(answers);

      let savedFiles = await this.fileManager.getFilesList('./files') as any[];
      savedFiles = savedFiles.filter(file => file.name !== '.keep');

      if(savedFiles.length > 0) {
        const confirm = await inquirer.prompt([{
          name: 'confirm',
          type: 'confirm',
          default: false,
          message: 'Do you want to add some stored files? '
        }]);

        if (confirm.confirm) {
          const options = await inquirer.prompt([{
            name: 'files',
            type: 'checkbox',
            message: 'Select items to remove',
            choices: savedFiles
              .map(key => {
                return {
                  value: key,
                  name: key.path
                }
              })
              .concat([{value: 'cancel', name: 'Cancel'}])
          }]);

          if (!options.files.includes('cancel') && options.files.length > 0) {
            await scrapper.addFiles(options.files, answers.folder);
          }
        }
      }

      const selectedPostProcessors = await inquirer.prompt([{
        name: 'items',
        type: 'checkbox',
        message: 'Select post processors to execute',
        choices: Object.keys(postProcessors)
          .map(key => {
            return {
              value: key,
              name: key
            }
          })
          .concat([{value: 'cancel', name: 'Cancel'}])
      }]);

      await this.applyPostProcessors(selectedPostProcessors.items, answers.folder, this.fileManager, scrapper);

      res();
    });
  }

  async applyPostProcessors(ppNames, folder, fileManager, scrapper) {
    for (const postProcessorName of ppNames) {
      const processor = new postProcessors[postProcessorName](folder, fileManager, scrapper);
      await processor.process();
    }
  }

  async deployToGHPages() {
    let list = await this.fileManager.getList();
    list = list.filter(name => name !== 'presets.json');

    const answers = await inquirer.prompt([{
      name: 'folder',
      type: 'list',
      message: 'Select sources folder ',
      choices: list
        .map(key => {
          return {
            value: key,
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

    answers.repo = removeEndSlash(answers.repo);
    return Publisher.publishToGithub(answers);
  }

  async usePreset() {
    let presetsList = await this.fileManager.read('./save/presets.json');
    presetsList = Object.values(JSON.parse(presetsList));

    const answers = await inquirer.prompt([{
      name: 'preset',
      type: 'list',
      message: 'Select preset to perform',
      choices: presetsList
        .map((preset, index) => {
          return {
            value: index,
            name: preset.description
          }
        })
      }]);

    const preset = presetsList[answers.preset];

    return new Promise(async (res) => {
      const randomFolderName = `folder_${new Date().getTime()}`;

      console.log(chalk.green(chalk.bold('Preparing files structure\n')));

      await this.fileManager.createSiteStructure(randomFolderName);
      console.log(chalk.green(chalk.bold('Start parsing\n')));
      const loader = new Loader(this.fileManager, randomFolderName,
        preset.originalHost, preset.targetHost);
      const scrapper = new Scrapper(this.fileManager, loader);

      await scrapper.scrap({
        url: preset.originalHost,
        host: preset.targetHost,
        folder: randomFolderName,
        sitemap: preset.sitemap
      });

      if (preset.postprocessors && preset.postprocessors.length > 0) {
        await this.applyPostProcessors(preset.postprocessors, randomFolderName, this.fileManager, scrapper);
      }

      if (preset.files && preset.files.length > 0) {
        await scrapper.addFiles(preset.files, randomFolderName);
      }

      await Publisher.publishToGithub({
        folder: randomFolderName,
        repo: preset.githubRepo,
        branch: preset.targetBranch
      });

      console.log(chalk.yellow(chalk.bold('Removing temporary files\n')));

      await this.fileManager.clearBatch([randomFolderName]);
      console.log(chalk.green(chalk.bold('Removing complete\n\n')));

      res();
    });
  }
}
