/**
 * Deploy Template System
 * 
 * This script is for use during development to quickly update all HTML files
 * to use the shared header and footer templates.
 * 
 * Run this script from the project root using Node.js:
 * node assets/js/deploy-templates.js
 */

const fs = require('fs');
const path = require('path');

// Config
const rootDir = './';
const htmlExtension = '.html';
const templateScriptPath = 'assets/js/template-loader.js';

// Get all HTML files
function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !filePath.includes('node_modules')) {
            getAllHtmlFiles(filePath, fileList);
        } else if (file.endsWith(htmlExtension)) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Update HTML file to use template system
function updateHtmlFile(filePath) {
    console.log(`Processing: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already using template system
    if (content.includes(templateScriptPath)) {
        console.log(`  Already using template system.`);
        return;
    }
    
    // Find </head> position
    const headEndPos = content.indexOf('</head>');
    if (headEndPos === -1) {
        console.error(`  Error: Could not find </head> tag in ${filePath}`);
        return;
    }
    
    // Calculate root path based on file location
    const relativePath = path.relative(path.dirname(filePath), rootDir);
    const rootPath = relativePath ? relativePath + '/' : '';
    
    // Insert template loader script
    const scriptTag = `    <script src="${rootPath}${templateScriptPath}"></script>\n`;
    
    content = content.substring(0, headEndPos) + scriptTag + content.substring(headEndPos);
    
    // Simplify content by removing navigation and footer
    try {
        // Remove navigation
        const navStartPos = content.indexOf('<nav');
        if (navStartPos !== -1) {
            const navEndPos = content.indexOf('</nav>') + 6;
            if (navEndPos > 6) {
                content = content.substring(0, navStartPos) + content.substring(navEndPos);
                console.log('  Removed navigation.');
            }
        }
        
        // Remove footer
        const footerStartPos = content.indexOf('<footer');
        if (footerStartPos !== -1) {
            const footerEndPos = content.indexOf('</footer>') + 9;
            if (footerEndPos > 9) {
                content = content.substring(0, footerStartPos) + content.substring(footerEndPos);
                console.log('  Removed footer.');
            }
        }
        
        // Write updated content back to file
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  ✅ Successfully updated ${filePath}`);
    } catch (error) {
        console.error(`  Error updating ${filePath}: ${error.message}`);
    }
}

// Main function
function main() {
    try {
        const htmlFiles = getAllHtmlFiles(rootDir);
        console.log(`Found ${htmlFiles.length} HTML files to process.`);
        
        htmlFiles.forEach(file => {
            updateHtmlFile(file);
        });
        
        console.log('Done!');
    } catch (error) {
        console.error(`Error: ${error.message}`);
    }
}

// Run main function
main(); 