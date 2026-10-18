const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
async function blurvideo(buffer) {
    const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    
    return new Promise((resolve, reject) => {
        const tempInput = `temp_input_${Date.now()}.mp4`;
        const tempOutput = `temp_output_${Date.now()}.mp4`;
        
        fs.writeFileSync(tempInput, inputBuffer);
        
        ffmpeg(tempInput)
            .videoFilters([
                {
                    filter: 'boxblur',
                    options: '10:5'
                }
            ])
            .on('end', () => {
                const outputBuffer = fs.readFileSync(tempOutput);
                fs.unlinkSync(tempInput);
                fs.unlinkSync(tempOutput);
                resolve(outputBuffer);
            })
            .on('error', (err) => {
                if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                reject(err);
            })
            .save(tempOutput);
    });
}

// Example use
const vid = fs.readFileSync('./input.mp4');
const output = await blurvideo(vid);
await fs.writeFileSync('./result.mp4', output);
console.log('Succes, watch result.mp4');
