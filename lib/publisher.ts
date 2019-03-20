import chalk from 'chalk';

const ghPages = require('gh-pages');
const Spinner = require('cli-spinner').Spinner;

export class Publisher {
  static publishToGithub(params) {
    return new Promise(async (res) => {
      const spinner = new Spinner(chalk.yellow(chalk.bold(`Publishing to ${params.repo}`)));
      spinner.setSpinnerString(27);
      spinner.start();

      await ghPages.publish(`./save/${params.folder}`, {
        branch: params.branch,
        repo: params.repo
      });

      spinner.stop(true);

      console.log(chalk.green(chalk.bold('Published successfully')));
      res();
    });
  }
}
