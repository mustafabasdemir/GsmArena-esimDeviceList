const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

//User-Agent 
const axiosInstance = axios.create({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
    }
});

const BASE_URL = "https://www.gsmarena.com/";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min = 1500, max = 5000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getPhoneLinks() {
    const url = "https://www.gsmarena.com/results.php3?sSIMTypes=4";
    try {
        const { data } = await axiosInstance.get(url);
        const $ = cheerio.load(data);
        const phoneLinks = [];

        $('div.makers ul li a').each((i, elem) => {
            const link = $(elem).attr('href');
            if (link) phoneLinks.push(BASE_URL + link);
        });

        return phoneLinks;
    } catch (error) {
        console.error("Ana sayfa linkleri alınırken hata:", error.message);
        return [];
    }
}

async function getPhoneDetails(phoneUrl, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            const { data } = await axiosInstance.get(phoneUrl);
            const $ = cheerio.load(data);

            const modelName = $('h1.specs-phone-name-title[data-spec="modelname"]').text().trim();
            const modelCode = $('td.nfo[data-spec="models"]').text().trim();

            return {
                url: phoneUrl,
                modelName: modelName || "Yok",
                modelCode: modelCode || "Yok"
            };
        } catch (error) {
            if (error.response?.status === 429) {
                console.warn(`429 hatası: Bekleniyor... (${phoneUrl})`);
                await sleep(5000);
            } else {
                console.error(`Detaylar alınırken hata (${phoneUrl}):`, error.message);
                break;
            }
        }
    }

    return {
        url: phoneUrl,
        modelName: null,
        modelCode: null
    };
}

async function main() {
    const phoneLinks = await getPhoneLinks();
    if (phoneLinks.length === 0) {
        console.log("Hiç telefon linki bulunamadı. Program sonlanıyor.");
        return;
    }

    const allData = [];

    for (let i = 0; i < phoneLinks.length; i++) {
        console.log(`(${i + 1}/${phoneLinks.length}) İşleniyor: ${phoneLinks[i]}`);
        const details = await getPhoneDetails(phoneLinks[i]);
        allData.push(details);

        // Rastgele saniye
        await sleep(randomDelay());
    }

    //json kayit
    try {
        fs.writeFileSync('phones_data.json', JSON.stringify(allData, null, 4), 'utf-8');
        console.log("phones_data.json dosyası başarıyla oluşturuldu.");
    } catch (err) {
        console.error("Dosya yazılırken hata oluştu:", err.message);
    }
}

main();
