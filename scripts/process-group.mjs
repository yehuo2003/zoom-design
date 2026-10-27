import { spawn } from 'node:child_process';
import { join } from 'node:path';

export class ProcessGroup {
  constructor(onFailure = () => {}) { this.children = new Set(); this.expected = new WeakSet(); this.onFailure = onFailure; this.stopping = false; }
  start(command, args, { label = command, transient = false, ...options } = {}) {
    if (this.stopping) throw Error('Process group already stopped');
    const child = spawn(command, args, { stdio: 'inherit', detached: process.platform !== 'win32', windowsHide: true, ...options, shell: false });
    this.children.add(child);
    child.once('error', error => { this.children.delete(child); if (!this.stopping) this.onFailure(Error(`${label}: ${error.message}`)); });
    child.once('exit', (code, signal) => {
      this.children.delete(child);
      if (!transient && !this.stopping && !this.expected.has(child)) this.onFailure(Error(`${label} stopped unexpectedly (${signal ?? code})`));
    });
    return child;
  }
  async stopChild(child) {
    if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) return;
    this.expected.add(child);
    const closed = new Promise(accept => child.once('close', accept));
    if (process.platform === 'win32') {
      const executable = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/taskkill.exe');
      await new Promise((accept, reject) => {
        const killer = spawn(executable, ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore', windowsHide: true, shell: false });
        killer.once('error', reject);
        killer.once('exit', code => {
          if (code === 0 || child.exitCode !== null || child.signalCode !== null) accept();
          else reject(Error(`Cannot terminate managed process tree ${child.pid} (${code})`));
        });
      });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    await closed; this.children.delete(child);
  }
  stop() {
    if (!this.stopPromise) {
      this.stopping = true;
      this.stopPromise = Promise.allSettled([...this.children].map(child => this.stopChild(child))).then(results => {
        const failure = results.find(result => result.status === 'rejected');
        if (failure) throw failure.reason;
      });
    }
    return this.stopPromise;
  }
}
