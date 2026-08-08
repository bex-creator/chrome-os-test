const vm = new Chip8();
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');
let loopRunning = false;

// The original CHIP-8 had a 16-key hex keypad. 
// We map it to the left side of a modern QWERTY keyboard.
const keyMap = {
    '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
    'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
    'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
    'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
};

// Listen for Keyboard Input
window.addEventListener('keydown', (e) => {
    const key = keyMap[e.key.toLowerCase()];
    if (key !== undefined) vm.keypad[key] = 1;
});

window.addEventListener('keyup', (e) => {
    const key = keyMap[e.key.toLowerCase()];
    if (key !== undefined) vm.keypad[key] = 0;
});

// Handle ROM Upload
document.getElementById('romUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Reset VM state if a new game is loaded
        vm.pc = 0x200;
        vm.display.fill(0);
        vm.memory.fill(0);
        
        // Re-load fonts and ROM
        for (let i = 0; i < FONT_SET.length; i++) vm.memory[i] = FONT_SET[i];
        vm.loadROM(new Uint8Array(e.target.result));
        
        if (!loopRunning) {
            loopRunning = true;
            requestAnimationFrame(cpuLoop);
        }
    };
    reader.readAsArrayBuffer(file);
});

// Draw graphics to the Canvas
function renderScreen() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 64, 32);

    ctx.fillStyle = 'white';
    for (let i = 0; i < vm.display.length; i++) {
        if (vm.display[i] === 1) {
            const x = i % 64;
            const y = Math.floor(i / 64);
            // Draw a 1x1 rectangle for each active pixel
            ctx.fillRect(x, y, 1, 1);
        }
    }
}

// The core execution loop
function cpuLoop() {
    // Run 10 CPU instructions per frame (approx 600Hz)
    for (let i = 0; i < 10; i++) {
        vm.cycle();
    }
    
    renderScreen();
    requestAnimationFrame(cpuLoop);
}
