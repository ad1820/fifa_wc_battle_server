import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonDir = path.join(__dirname, '../json_attributes');

function generateId(name, nation) {
    return crypto.createHash('md5').update(`${name}-${nation}`).digest('hex');
}

function processFiles() {
    const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
    
    for (const file of files) {
        const filePath = path.join(jsonDir, file);
        try {
            const rawData = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(rawData);
            
            let updated = false;
            const newData = data.map(player => {
                if (!player.id && player.name && player.nation) {
                    // Prepend the new property 'id' at the beginning of the object for better readability
                    const newPlayer = { id: generateId(player.name, player.nation), ...player };
                    updated = true;
                    return newPlayer;
                }
                return player;
            });
            
            if (updated) {
                fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf8');
                console.log(`Injected IDs into ${file}`);
            } else {
                console.log(`No updates needed for ${file} (or missing name/nation fields)`);
            }
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
        }
    }
}

processFiles();
