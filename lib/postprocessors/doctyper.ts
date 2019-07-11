import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;

import { Postprocessor } from './postprocessor';
import FileManager from '../file-manager';

export default class Doctyper extends Postprocessor {

  constructor(private folder: string, private fileManager: FileManager) {
    super();
  }
  async process() {
    console.log(chalk.yellow(chalk.bold('Adding the doctype attribute:')));
    const doctypeHtml5String = '<!DOCTYPE html>';
    const doctypeCheckPattern = '<!DOCTYPE';

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
      if (fileContent.indexOf(doctypeCheckPattern) === 0) {
        spinner.stop(true);
        console.log(file.path + chalk.yellow(' doctype already exists'));
        continue;
      }

      const updated = doctypeHtml5String + fileContent;

      await this.fileManager.directSave(file.path, updated);
      spinner.stop(true);
      console.log(file.path + chalk.green(' done'));

    }
    console.log(chalk.green(chalk.bold('Processing complete\n')))
  }
}
