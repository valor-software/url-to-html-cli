import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;

import { Postprocessor } from './postprocessor';
import FileManager from '../file-manager';
import Scrapper from '../scrapper';
import { removeProtocol } from '../utils';

export default class SitemapGenerator extends Postprocessor {
  constructor(private folder: string,
              private fileManager: FileManager,
              private scrapper: Scrapper) {
    super();
  }

  async process() {
    chalk.yellow(chalk.bold('Sitemap generation'));
    const spinner = new Spinner({text: `Processing %s`});
    spinner.setSpinnerString(27);
    spinner.start();

    const forbiddenPatterns = ['/cdn-cgi/l/'];
    const host = removeProtocol(this.scrapper.host);
    const url = removeProtocol(this.scrapper.url);

    const sitemap =
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
      ].concat(
        this.scrapper.scrappedPages
          .filter(page =>
            typeof forbiddenPatterns.find(pattern =>
              page.indexOf(pattern) > -1) === 'undefined')
          .map(item => {
            const finalPage = item.replace(url, host);

            return `  <url><loc>${finalPage}</loc></url>`;
          })
      )
        .concat(['</urlset>'])
        .join('\n');

    await this.fileManager.save(this.folder, 'sitemap.xml', sitemap);
    spinner.stop();
    console.log(chalk.green(chalk.bold('Sitemap generated successfully\n')));
  }
}
