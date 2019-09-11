const JSDOM = require('jsdom').JSDOM;
import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;

import { Postprocessor } from './postprocessor';
import FileManager from '../file-manager';

export default class Markdowner extends Postprocessor {

  constructor(private folder: string, private fileManager: FileManager) {
    super();
  }
  async process() {
    console.log(chalk.yellow(chalk.bold('Apply markdown:')));
    const mainRegexp = /~\|(.*?)\|~/gm;
    const tags = {
      '~|ss|~': '<s>',
      '~|se|~': '</s>',
      '~|cs|~': '<code>',
      '~|ce|~': '</code>',
      '~|bs|~': '<b>',
      '~|be|~': '</b>',
      '~|is|~': '<i>',
      '~|ie|~': '</i>'
    };

    const filesList: {name: string; path: string}[] =
      await this.fileManager.getFilesList(`./save/${this.folder}`, [`./save/${this.folder}/assets`]);

    for (const file of filesList) {
      const spinner = new Spinner({text: `${file.path} %s`});
      spinner.setSpinnerString(27);
      spinner.start();
      if (file.path.indexOf('.html') === -1) {
        spinner.stop(true);
        console.log(file.path + chalk.yellow(' skipped'));
        continue;
      }
      const fileContent = await this.fileManager.read(file.path);
      const dom = new JSDOM(fileContent);
      const richsnippets = dom.window.document.querySelectorAll('.w-richtext');

      await richsnippets.forEach(async snippet => {
        snippet.innerHTML = snippet.innerHTML
          .replace(mainRegexp, text => tags[text]);
      });

      await this.fileManager.directSave(file.path, dom.window.document.documentElement.outerHTML)
      spinner.stop(true);
      console.log(file.path + chalk.green(' done'));

    }
    console.log(chalk.green(chalk.bold('Markdown applied\n')))
  }
}
