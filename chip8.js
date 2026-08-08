const FONT_SET = new Uint8Array([
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80  // F
]);

class Chip8 {
    constructor() {
        this.memory = new Uint8Array(4096);
        this.v = new Uint8Array(16);
        this.i = 0;
        this.pc = 0x200;
        this.stack = new Uint16Array(16);
        this.sp = 0;
        this.display = new Uint8Array(64 * 32);
        this.keypad = new Uint8Array(16);
        this.delayTimer = 0;
        this.soundTimer = 0;
        
        // Load fonts into memory (0x000 to 0x04F)
        for (let i = 0; i < FONT_SET.length; i++) {
            this.memory[i] = FONT_SET[i];
        }
    }

    loadROM(romBuffer) {
        for (let i = 0; i < romBuffer.length; i++) {
            this.memory[0x200 + i] = romBuffer[i];
        }
    }

    cycle() {
        // 1. Fetch
        let opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
        this.pc += 2;

        // 2 & 3. Decode & Execute
        let x = (opcode & 0x0F00) >> 8;
        let y = (opcode & 0x00F0) >> 4;
        let nn = opcode & 0x00FF;
        let nnn = opcode & 0x0FFF;

        switch (opcode & 0xF000) {
            case 0x0000:
                if (opcode === 0x00E0) {
                    this.display.fill(0); // CLS
                } else if (opcode === 0x00EE) {
                    this.sp--;
                    this.pc = this.stack[this.sp]; // RET
                }
                break;
            case 0x1000: this.pc = nnn; break; // JP addr
            case 0x2000: // CALL addr
                this.stack[this.sp] = this.pc;
                this.sp++;
                this.pc = nnn;
                break;
            case 0x3000: if (this.v[x] === nn) this.pc += 2; break; // SE Vx, byte
            case 0x4000: if (this.v[x] !== nn) this.pc += 2; break; // SNE Vx, byte
            case 0x5000: if (this.v[x] === this.v[y]) this.pc += 2; break; // SE Vx, Vy
            case 0x6000: this.v[x] = nn; break; // LD Vx, byte
            case 0x7000: this.v[x] = (this.v[x] + nn) & 0xFF; break; // ADD Vx, byte
            case 0x8000:
                switch (opcode & 0x000F) {
                    case 0x0: this.v[x] = this.v[y]; break; // LD
                    case 0x1: this.v[x] |= this.v[y]; break; // OR
                    case 0x2: this.v[x] &= this.v[y]; break; // AND
                    case 0x3: this.v[x] ^= this.v[y]; break; // XOR
                    case 0x4: // ADD with carry
                        this.v[0xF] = (this.v[x] + this.v[y] > 255) ? 1 : 0;
                        this.v[x] = (this.v[x] + this.v[y]) & 0xFF;
                        break;
                    case 0x5: // SUB
                        this.v[0xF] = (this.v[x] > this.v[y]) ? 1 : 0;
                        this.v[x] = (this.v[x] - this.v[y]) & 0xFF;
                        break;
                    case 0x6: // SHR
                        this.v[0xF] = this.v[x] & 0x1;
                        this.v[x] >>= 1;
                        break;
                    case 0x7: // SUBN
                        this.v[0xF] = (this.v[y] > this.v[x]) ? 1 : 0;
                        this.v[x] = (this.v[y] - this.v[x]) & 0xFF;
                        break;
                    case 0xE: // SHL
                        this.v[0xF] = (this.v[x] & 0x80) >> 7;
                        this.v[x] = (this.v[x] << 1) & 0xFF;
                        break;
                }
                break;
            case 0x9000: if (this.v[x] !== this.v[y]) this.pc += 2; break; // SNE Vx, Vy
            case 0xA000: this.i = nnn; break; // LD I, addr
            case 0xB000: this.pc = nnn + this.v[0]; break; // JP V0, addr
            case 0xC000: this.v[x] = Math.floor(Math.random() * 256) & nn; break; // RND
            case 0xD000: // DRW
                let width = 8;
                let height = opcode & 0x000F;
                this.v[0xF] = 0; // Reset collision flag

                for (let row = 0; row < height; row++) {
                    let sprite = this.memory[this.i + row];
                    for (let col = 0; col < width; col++) {
                        if ((sprite & 0x80) > 0) {
                            let px = (this.v[x] + col) % 64;
                            let py = (this.v[y] + row) % 32;
                            let idx = px + (py * 64);
                            
                            if (this.display[idx] === 1) this.v[0xF] = 1;
                            this.display[idx] ^= 1;
                        }
                        sprite <<= 1; // Shift sprite left to check next bit
                    }
                }
                break;
            case 0xE000:
                if (nn === 0x9E && this.keypad[this.v[x]]) this.pc += 2; // SKP
                if (nn === 0xA1 && !this.keypad[this.v[x]]) this.pc += 2; // SKNP
                break;
            case 0xF000:
                switch (nn) {
                    case 0x07: this.v[x] = this.delayTimer; break;
                    case 0x0A: // Wait for key press
                        let keyPressed = false;
                        for (let k = 0; k < 16; k++) {
                            if (this.keypad[k]) {
                                this.v[x] = k;
                                keyPressed = true;
                            }
                        }
                        if (!keyPressed) this.pc -= 2; // Loop instruction if no key
                        break;
                    case 0x15: this.delayTimer = this.v[x]; break;
                    case 0x18: this.soundTimer = this.v[x]; break;
                    case 0x1E: this.i += this.v[x]; break;
                    case 0x29: this.i = this.v[x] * 5; break; // Load font sprite addr
                    case 0x33: // Store BCD
                        this.memory[this.i] = Math.floor(this.v[x] / 100);
                        this.memory[this.i + 1] = Math.floor((this.v[x] % 100) / 10);
                        this.memory[this.i + 2] = this.v[x] % 10;
                        break;
                    case 0x55:
                        for (let r = 0; r <= x; r++) this.memory[this.i + r] = this.v[r];
                        break;
                    case 0x65:
                        for (let r = 0; r <= x; r++) this.v[r] = this.memory[this.i + r];
                        break;
                }
                break;
            default:
                console.log(`Unknown opcode: 0x${opcode.toString(16)}`);
        }

        // 4. Update Timers (Usually timers run at 60Hz, independent of CPU speed, but simplified here)
        if (this.delayTimer > 0) this.delayTimer--;
        if (this.soundTimer > 0) this.soundTimer--;
    }
}
