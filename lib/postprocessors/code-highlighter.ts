const JSDOM = require('jsdom').JSDOM;
import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;

import { Postprocessor } from './postprocessor';
import FileManager from '../file-manager';

export default class CodeHighlighter extends Postprocessor {

  constructor(private folder: string, private fileManager: FileManager) {
    super();
  }
  async process() {
    console.log(chalk.yellow(chalk.bold('Code highlighting:')));
    const regs = {
      code: /<h6>~~~([^~]+)~~~/gm,
      fullsnippet: /<div class="w-richtext"><h6>~~~([^~]+)~~~/gm,
      lang: /(~~~%){1}(\w|\s)*(%)/gm,
      langWrapper: /(~~~%)|(%)/gm,
      wrap: /(~~~)|(%(\w*)%)/gm,
      tag: /[<]{1}(\w|\/)*[>]{1}/gm
    };

    const filesList: {name: string; path: string}[] =
      await this.fileManager.getFilesList(`./save/${this.folder}`, [`./save/${this.folder}/assets`]);

    for (const file of filesList) {
      const spinner = new Spinner({text: `${file.path} %s`});
      spinner.setSpinnerString(27);
      spinner.start();
      const fileContent = await this.fileManager.read(file.path);
      const dom = new JSDOM(fileContent);
      const richsnippets = dom.window.document.querySelectorAll('.w-richtext');

      await richsnippets.forEach(async snippet => {
        snippet.innerHTML = snippet.innerHTML.replace(regs.code, codepart => {
          const lang = codepart.match(regs.lang)[0].replace(regs.langWrapper, '');
          codepart = codepart.replace(regs.wrap, '');
          const notags = codepart.replace(regs.tag, tag => {
            return tag === '<br>' ? '\n' : '';
          });
          const escaped = notags.replace(/(&nbsp;)/sgm, '');
          return `<pre><code class="${lang}">${escaped}</code></pre>`;
        });
      });

      await this.fileManager.directSave(file.path, dom.window.document.documentElement.outerHTML)
      spinner.stop(true);
      console.log(file.path + chalk.green(' done'));

    }
    console.log(chalk.green(chalk.bold('Highlighting complete\n')))
  }
}
