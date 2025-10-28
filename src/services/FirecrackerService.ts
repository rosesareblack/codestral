import { FirecrackerVM } from '@/types';

class FirecrackerService {
  private vms: Map<string, FirecrackerVM> = new Map();
  private vmIdCounter = 0;

  async createVM(workspaceId: string, config?: { cpuCount?: number; memoryMb?: number; diskSizeGb?: number }): Promise<FirecrackerVM> {
    await this.simulateDelay(1500);

    const vm: FirecrackerVM = {
      id: this.generateVMId(),
      workspaceId,
      status: 'running',
      cpuCount: config?.cpuCount || 2,
      memoryMb: config?.memoryMb || 2048,
      diskSizeGb: config?.diskSizeGb || 10,
      createdAt: new Date(),
    };

    this.vms.set(vm.id, vm);
    console.log(`[Firecracker] Created VM ${vm.id} for workspace ${workspaceId}`);
    return vm;
  }

  async startVM(vmId: string): Promise<void> {
    await this.simulateDelay(1000);
    const vm = this.vms.get(vmId);
    if (vm) {
      vm.status = 'running';
      console.log(`[Firecracker] Started VM ${vmId}`);
    }
  }

  async stopVM(vmId: string): Promise<void> {
    await this.simulateDelay(800);
    const vm = this.vms.get(vmId);
    if (vm) {
      vm.status = 'stopped';
      console.log(`[Firecracker] Stopped VM ${vmId}`);
    }
  }

  async pauseVM(vmId: string): Promise<void> {
    await this.simulateDelay(500);
    const vm = this.vms.get(vmId);
    if (vm) {
      vm.status = 'paused';
      console.log(`[Firecracker] Paused VM ${vmId}`);
    }
  }

  async deleteVM(vmId: string): Promise<void> {
    await this.simulateDelay(1000);
    this.vms.delete(vmId);
    console.log(`[Firecracker] Deleted VM ${vmId}`);
  }

  getVM(vmId: string): FirecrackerVM | undefined {
    return this.vms.get(vmId);
  }

  getAllVMs(): FirecrackerVM[] {
    return Array.from(this.vms.values());
  }

  getVMsByWorkspace(workspaceId: string): FirecrackerVM[] {
    return this.getAllVMs().filter(vm => vm.workspaceId === workspaceId);
  }

  async executeCommand(vmId: string, command: string): Promise<string> {
    await this.simulateDelay(500);
    const vm = this.vms.get(vmId);
    
    if (!vm || vm.status !== 'running') {
      throw new Error('VM is not running');
    }

    // Mock command execution
    const outputs: Record<string, string> = {
      'ls': 'file1.js\nfile2.ts\npackage.json\nREADME.md',
      'pwd': '/workspace',
      'whoami': 'developer',
      'node --version': 'v20.10.0',
      'npm --version': '10.2.3',
      'python --version': 'Python 3.11.5',
      'git status': 'On branch main\nnothing to commit, working tree clean',
    };

    return outputs[command] || `Executed: ${command}\nOutput simulated in Firecracker VM ${vmId}`;
  }

  async snapshotVM(vmId: string): Promise<string> {
    await this.simulateDelay(2000);
    const snapshotId = `snapshot-${vmId}-${Date.now()}`;
    console.log(`[Firecracker] Created snapshot ${snapshotId} for VM ${vmId}`);
    return snapshotId;
  }

  async restoreVM(snapshotId: string): Promise<FirecrackerVM> {
    await this.simulateDelay(2000);
    
    const vm: FirecrackerVM = {
      id: this.generateVMId(),
      workspaceId: 'restored',
      status: 'running',
      cpuCount: 2,
      memoryMb: 2048,
      diskSizeGb: 10,
      createdAt: new Date(),
    };

    this.vms.set(vm.id, vm);
    console.log(`[Firecracker] Restored VM ${vm.id} from snapshot ${snapshotId}`);
    return vm;
  }

  private generateVMId(): string {
    return `vm-${Date.now()}-${this.vmIdCounter++}`;
  }

  private async simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const firecrackerService = new FirecrackerService();
