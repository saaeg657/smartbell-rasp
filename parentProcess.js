const { spawn, exec } = require('child_process');
const http = require('http');
const conv = require('binstring');
const nfcPath = './apdu_tag_test';
const nfcProcess = spawn('stdbuf', ['-i0', '-o0', '-e0', nfcPath]);
const vidProcess = spawn('./raspivid_command.sh', []);
const deviceId = "22e4d366-a602-11e7-abc4-cec278b6b50a";
const hostname = "13.124.244.253";


var isReadyReceiving = false;
var stdoutResult = '';
var UUID = '';


nfcProcess.stdin.on('data', (data) => {
  console.log(`stdin: ${data}`);
});

nfcProcess.stdout.on('data', (data) => {
  var dataToString = data.toString('utf8');
  console.log('[',data.toString('utf8'),']');
  if (dataToString == 'O') {
    isReadyReceiving = true;
  } else if (dataToString == 'X') {
    isReadyReceiving = false;
    console.log(stdoutResult);
    UUID = conv(stdoutResult.split(' ').slice(9,-3), {in: 'hex', out: 'utf8'});
    console.log(UUID);
    requestHandler(UUID)
    .then((res) => {
      console.log(res);
    })
    .catch();
    stdoutResult = '';
  } else {
    if (isReadyReceiving) stdoutResult += dataToString;
  }
});

nfcProcess.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

nfcProcess.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

vidProcess.stdout.on('data', (data) => {
  console.log(`[vidProcess.stdout] : ${data}`);
});

vidProcess.stderr.on('data', (data) => {
  // console.log(`[vidProcess.stderr] : ${data}`);
});

vidProcess.on('close', (code) => {
  console.log(`[vidProcess.close] : child process exited with code ${code}`);
  vidProcess();
});

const requestHandler = (UUID) => new Promise((resolve, reject) => {
  
  const path = `/graphql?query=mutation{smartbellSendPush(input:{deviceId:"${deviceId}",visitorId:"${UUID}"}){result}}`;
  const query = { query: `mutation{smartbellSendPush(input: {deviceId: "${deviceId}", visitorId: "${UUID}"}){result}}` };
  console.log(path);
  const options = {
    hostname,
    path,
    port: 5002,
    method: 'POST',
    headers:{
      authorization: 'TT'
    }
  }
  var data = '';
  var req = http.request(options, (res) => {
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log(data);
      resolve(data);
    });
  })
  req.end();
  
});