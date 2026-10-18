async function compressImg(buffer, targetSizeKB = 100) {
  try {
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const formData = new FormData();
    formData.append('myFile[]', blob, 'image.jpg');
    formData.append('kbsize', targetSizeKB.toString());
    formData.append('dpis', '{}');

    const compressResponse = await fetch('https://imback.pi7.org/compressimage', {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'accept-language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        'origin': 'https://image.pi7.org',
        'referer': 'https://image.pi7.org/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
      },
      body: formData
    });

    if (!compressResponse.ok) {
      throw new Error(`Compress failed: ${compressResponse.status}`);
    }

    const responseText = await compressResponse.text();
    
    let uploadedFilename;
    try {
      const resJson = JSON.parse(responseText);
      if (resJson.images && resJson.images.length > 0) {
        uploadedFilename = resJson.images[0].split('/').pop();
      }
    } catch (e) {}

    if (!uploadedFilename) {
      const filenameMatch = responseText.match(/(?:static\/uploadimg\/|uploadimg\/)?([^"'\s><]+\.(?:jpe?g|png|webp|jfif))/i);
      if (filenameMatch) {
        uploadedFilename = filenameMatch[1].split('/').pop();
      }
    }

    if (!uploadedFilename) {
      throw new Error(`Server response invalid: ${responseText.slice(0, 100)}`);
    }

    const imageUrl = `https://imback.pi7.org/downloadimage/uploadimg/${uploadedFilename}`;
    const downloadResponse = await fetch(imageUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
      }
    });

    if (!downloadResponse.ok) {
      throw new Error(`Download failed: ${downloadResponse.status}`);
    }

    const compressedBuffer = Buffer.from(await downloadResponse.arrayBuffer());

    fetch('https://imback.pi7.org/delete-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'origin': 'https://image.pi7.org'
      },
      body: JSON.stringify([{
        filename: uploadedFilename,
        size: compressedBuffer.length
      }])
    }).catch(() => {});

    return compressedBuffer;
  } catch (error) {
    throw new Error(`Failed to compress image: ${error.message}`);
  }
}
// Example use
const fs = require('fs');
const img = fs.readFileSync('./input.jpg');
const output  = await compressImg(img, 100)
await fs.writeFileSync('./result.jpg', output)
console.log('Succes, check size result.jpg')
