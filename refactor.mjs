import fs from 'fs';
import path from 'path';

const basePath = 'e:\\Ertval One\\_Software\\zone-modules\\Modules\\graphql';
const srcPath = path.join(basePath, 'src');
const testsPath = path.join(basePath, 'tests');

function isDirectory(p) {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
}

function getFilesRecursively(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        if (isDirectory(file)) {
            results = results.concat(getFilesRecursively(file));
        } else {
            results.push(file);
        }
    });
    return results;
}

const allSrcFiles = getFilesRecursively(srcPath);

const renames = {};
const newPaths = new Set();

allSrcFiles.forEach(file => {
    const relPath = path.relative(srcPath, file).replace(/\\/g, '/');
    const parts = relPath.split('/');
    
    // e.g. features/dashboard/core/dashboard.metrics.js
    if (parts.length > 2) {
        const topDir = parts[0]; // features or infrastructure
        const category = parts[1]; // dashboard, shared, graphql
        const fileName = parts[parts.length - 1];
        
        let newFileName = fileName;
        if (fileName === 'index.js') {
            newFileName = category + '.js';
        } else if (!fileName.startsWith(category + '.')) {
            newFileName = category + '.' + fileName;
        }
        
        const newRelPath = topDir + '/' + newFileName;
        renames[relPath] = newRelPath;
    } else if (parts.length === 2) {
        // e.g. features/index.js ? Maybe already flat somehow
        // Wait, features/collaborations/index.js is length 3.
        const topDir = parts[0];
        const fileName = parts[1];
        renames[relPath] = topDir + '/' + fileName;
    }
});

// Build old path -> new absolute path
const absRenames = {};
for (const [oldRel, newRel] of Object.entries(renames)) {
    absRenames[path.join(srcPath, oldRel)] = path.join(srcPath, newRel);
}

// Function to resolve import paths
function resolveImportPath(currentFileAbs, importedPath) {
    if (!importedPath.startsWith('.')) return null;
    const currentDir = path.dirname(currentFileAbs);
    const resolvedOldAbs = path.resolve(currentDir, importedPath);
    return resolvedOldAbs;
}

// Function to get new relative import
function getNewRelativeImport(newCurrentFileAbs, newImportedAbs) {
    let rel = path.relative(path.dirname(newCurrentFileAbs), newImportedAbs).replace(/\\/g, '/');
    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }
    return rel;
}

// Map old absolute paths to their new absolute paths
const oldAbsToNewAbs = {};
for (const [oldRel, newRel] of Object.entries(renames)) {
    oldAbsToNewAbs[path.resolve(srcPath, oldRel)] = path.resolve(srcPath, newRel);
}

// To update JS files inside src
for (const file of allSrcFiles) {
    let content = fs.readFileSync(file, 'utf-8');
    const newCurrentAbs = absRenames[file] || file;
    
    // Regex for import/export statements
    content = content.replace(/(from|import)\s+['"]([^'"]+)['"]/g, (match, type, importedPath) => {
        if (!importedPath.startsWith('.')) return match;
        
        const oldImportAbs = resolveImportPath(file, importedPath);
        // find if oldImportAbs is mapped to something newly renamed
        if (oldAbsToNewAbs[oldImportAbs]) {
            const newImportAbs = oldAbsToNewAbs[oldImportAbs];
            const newRel = getNewRelativeImport(newCurrentAbs, newImportAbs);
            return `${type} '${newRel}'`;
        }
        return match;
    });
    
    fs.writeFileSync(file, content, 'utf-8');
}

// Update test files
const testFiles = getFilesRecursively(testsPath);
for (const file of testFiles) {
    if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
    let content = fs.readFileSync(file, 'utf-8');
    
    content = content.replace(/(from|import)\s+['"]([^'"]+)['"]/g, (match, type, importedPath) => {
        if (!importedPath.startsWith('.')) return match;
        
        const oldImportAbs = resolveImportPath(file, importedPath);
        if (oldAbsToNewAbs[oldImportAbs]) {
            const newImportAbs = oldAbsToNewAbs[oldImportAbs];
            const newRel = getNewRelativeImport(file, newImportAbs);
            return `${type} "${newRel}"`;
        }
        return match;
    });
    
    fs.writeFileSync(file, content, 'utf-8');
}

// Now rename the files
for (const [oldAbs, newAbs] of Object.entries(absRenames)) {
    if (oldAbs !== newAbs) {
        fs.renameSync(oldAbs, newAbs);
        console.log(`Renamed ${path.relative(basePath, oldAbs)} -> ${path.relative(basePath, newAbs)}`);
    }
}

// Finally remove empty dirs
function removeEmptyDirs(dir) {
    if (!fs.existsSync(dir)) return;
    const list = fs.readdirSync(dir);
    for (const item of list) {
        const fullPath = path.join(dir, item);
        if (isDirectory(fullPath)) {
            removeEmptyDirs(fullPath);
        }
    }
    if (fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
        console.log('Removed empty dir: ' + dir);
    }
}

removeEmptyDirs(srcPath);
console.log('Done refactoring directory structure.');
