// 1. Initialize the VM
const vm = new Chip8();

// 2. Get the screen ready
const canvas = document.getElementById('screen');
const ctx = canvas.getContext('2d');

// 3. Handle a user uploading a ROM file
document.getElementById('romUpload').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        // Convert the file into a raw byte array and load it
        const buffer = new Uint8Array(e.target.result);
        vm.loadROM(buffer);
        
        // Start the infinite CPU loop
        requestAnimationFrame(cpuLoop);
    };
    reader.readAsArrayBuffer(file);
});

// 4. The Infinite Loop
function cpuLoop() {
    // vm.cycle(); <-- You will build this function next!
    // renderScreen(); <-- Function to paint the canvas based on vm.display
    
    requestAnimationFrame(cpuLoop);
}
