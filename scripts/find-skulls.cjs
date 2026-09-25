const fs = require('fs');
const html = fs.readFileSync('C:/Users/desig/.gemini/antigravity-ide/brain/bcc2fb80-991e-4dbe-adc4-0c6b1dae0c0b/.system_generated/steps/8628/content.md', 'utf8');
const regex = /src=["'](https:\/\/static\.wikia\.nocookie\.net\/tibia\/images\/[^"']+)["']/g;
let m;
while ((m = regex.exec(html)) !== null) {
  if (m[1].toLowerCase().includes('skull')) {
    console.log(m[1]);
  }
}
