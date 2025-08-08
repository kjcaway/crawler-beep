const { exec } = require('child_process');
const Speaker = require('speaker');
const { Readable } = require('stream');

function createWaveHeader(sampleRate, bitDepth, numChannels, numSamples) {
    const blockAlign = numChannels * (bitDepth / 8);
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitDepth, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
}

function playBeep() {
    const sampleRate = 44100;
    const bitDepth = 16;
    const numChannels = 1;
    const duration = 1; // 1초
    const frequency = 440; // A4 톤
    const numSamples = sampleRate * duration;

    const header = createWaveHeader(sampleRate, bitDepth, numChannels, numSamples);
    const pcmData = Buffer.alloc(numSamples * numChannels * (bitDepth / 8));

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const amplitude = Math.sin(2 * Math.PI * frequency * t) * 32767;
        pcmData.writeInt16LE(Math.round(amplitude), i * 2);
    }

    const readable = new Readable();
    readable.push(header);
    readable.push(pcmData);
    readable.push(null);

    const speaker = new Speaker({
        channels: numChannels,
        bitDepth: bitDepth,
        sampleRate: sampleRate
    });

    readable.pipe(speaker);
}

function runCheck() {
  const timestamp = new Date().toLocaleString();
  console.log(`[${timestamp}] 상품 재고 확인을 시작합니다...`);

  exec('node index.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`[${timestamp}] 실행 중 오류 발생: ${error.message}`);
      return;
    }
    if (stderr) {
      // puppeteer는 진행 정보를 stderr로 출력하는 경우가 있으므로, 실제 에러인지 확인이 필요합니다.
      // 여기서는 일단 출력만 해줍니다.
      console.error(`[${timestamp}] 스크립트 로그(stderr): ${stderr}`);
    }

    console.log(`[${timestamp}] --- 스크립트 실행 결과 ---`);
    console.log(stdout.trim());
    console.log(`[${timestamp}] --- 결과 끝 ---`);

    // "판매중" 문자열이 결과에 포함되어 있는지 확인
    if (stdout.includes('판매중')) {
      console.log(`[${timestamp}] 판매중인 상품을 발견했습니다! 알림음이 울립니다.`);
      playBeep();
    } else {
      console.log(`[${timestamp}] 판매중인 상품이 없습니다.`);
    }
    console.log(`[${timestamp}] 30초 후 다음 확인을 시작합니다.`);
  });
}

// 스크립트 시작 시 즉시 1회 실행
runCheck();

// 30초마다 반복 실행 (30,000 밀리초)
setInterval(runCheck, 30000);
