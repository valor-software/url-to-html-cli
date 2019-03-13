const express = require('express');

const app = express();

// console.log('process.argv', process.argv);
const folder = './save/' + process.argv[2];
app.use(
  express.static(folder));

const port = 3000;

// process.on('SIGTERM', () => {
//   console.log('\n\n\n\nCHILD EXIT!!!', );
// })
//
// process.on('SIGINT', () => {
//   console.log('\n\n\n\nCHILD EXIT!!!', );
// })
// //
// process.on('exit', () => {
//   console.log('\n\n\n\nCHILD EXIT MAIN!!!', );
// })
//
// process.on('message', (meg) => {
//   console.log('\n\n\n\nCHILD  MSG!!!', );
// })
// setTimeout(() => {
//   throw Error('ERRRRRRRRRRRRRRRRRRRRR');
// }, 5000)

app.listen(port, () =>
  console.log(`Example app listening on port http://localhost:${port}!`));
