const JSDOM = require('jsdom').JSDOM;
import chalk from 'chalk';
const Spinner = require('cli-spinner').Spinner;

import { Postprocessor } from './postprocessor';
import FileManager from '../file-manager';

/**
 * Works only inside of <div class="w-richtext rich-text"></div>
 * Finds all images and wraps them by <a data-fancybox="gallery"></a>
 * Also adds links to the  fancybox's src and css files
 */
export default class GalleryWrapper extends Postprocessor {

  constructor(private folder: string, private fileManager: FileManager) {
    super();
  }

  async process() {
    console.log(chalk.yellow(chalk.bold('Wrapping images by gallery:')));
    const filesList: {name: string; path: string}[] =
      await this.fileManager.getFilesList(`./save/${this.folder}`, [`./save/${this.folder}/assets`]);

    for (const file of filesList) {
      const spinner = new Spinner({text: `${file.path} %s`});
      spinner.setSpinnerString(27);
      spinner.start();
      const fileContent = await this.fileManager.read(file.path);
      const dom = new JSDOM(fileContent);
      let isChanged = false;
      const richsnippets = dom.window.document.querySelectorAll('.w-richtext, .rich-text');
      richsnippets.forEach(snippet => {
        isChanged = wrapImage(snippet.children) || isChanged;
      });

      if (isChanged) {
        const script = dom.window.document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://cdn.jsdelivr.net/gh/fancyapps/fancybox@3.5.7/dist/jquery.fancybox.min.js";
        dom.window.document.querySelector('body').append(script);

        const link = dom.window.document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/gh/fancyapps/fancybox@3.5.7/dist/jquery.fancybox.min.css";
        dom.window.document.querySelector('body').append(link);

        await this.fileManager.directSave(file.path, dom.window.document.documentElement.outerHTML);
      }
      spinner.stop(true);
      console.log(file.path + chalk.green(' done'));
    }
    console.log(chalk.green(chalk.bold('Wrapping complete\n')));
  }
}

function wrapImage(inp) {
  let isChanged = false;
  Object.values(inp).forEach((item: any) => {
    if (item.nodeName.toLowerCase() === 'img') {
      item.outerHTML =
        `<a data-fancybox="gallery" href="${item.attributes.src.value}">${item.outerHTML}</a>`;
      isChanged = true;
    }
    if (!item.children || item.children.length === 0) {
      return isChanged;
    }
    isChanged = wrapImage(item.children) || isChanged;
  });
  return isChanged;
}
