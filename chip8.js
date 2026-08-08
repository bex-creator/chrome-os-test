class Chip8 {
    constructor() {
        // 4KB of Memory
        this.memory = new Uint8Array(4096);
        
        // 16 8-bit registers (V0 - VF)
        this.v = new Uint8Array(16);
        
        // 16-bit Index register
        this.i = 0;
        
        // Program Counter (starts at 0x200)
        this.pc = 0x200;
        
        // Stack and Stack Pointer
        this.stack = new Uint16Array(16);
        this.sp = 0;
        
        // 64x32 pixel monochrome display (0 = off, 1 = on)
        this.display = new Uint8Array(64 * 32);
        
        // 16-key hex keypad state
        this.keypad = new Uint8Array(16);
        
        // Timers
        this.delayTimer = 0;
        this.soundTimer = 0;
    }

    loadROM(romBuffer) {
        // Load the ROM data into memory starting at index 512 (0x200)
        for (let i = 0; i < romBuffer.length; i++) {
            this.memory[0x200 + i] = romBuffer[i];
        }
    }
}
