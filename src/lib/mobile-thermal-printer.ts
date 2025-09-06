import { Capacitor } from '@capacitor/core';
import { BleClient, BleDevice, textToDataView } from '@capacitor-community/bluetooth-le';

class MobileThermalPrinter {
  private device: BleDevice | null = null;
  private serviceUuid: string = '';
  private characteristicUuid: string = '';
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Mobile printer hanya tersedia di aplikasi mobile');
    }

    if (this.isInitialized) {
      return;
    }

    try {
      await BleClient.initialize();
      console.log('✅ Mobile BLE initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize BLE:', error);
      throw error;
    }
  }

  async requestPermissions(): Promise<void> {
    try {
      // Request Bluetooth permissions for Android
      if (Capacitor.getPlatform() === 'android') {
        await BleClient.requestLEScan({}, () => {});
        await BleClient.stopLEScan();
      }
    } catch (error) {
      console.warn('Permission request failed, continuing...', error);
    }
  }

  async scanAndConnect(): Promise<boolean> {
    try {
      await this.initialize();
      await this.requestPermissions();

      console.log('🔍 Scanning for thermal printers...');

      // Common thermal printer service UUIDs
      const thermalPrinterServices = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Generic thermal printer
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // HM-10 Bluetooth module
        '0000ff00-0000-1000-8000-00805f9b34fb', // Custom service
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
        '0000ffe0-0000-1000-8000-00805f9b34fb', // Common BLE service
        '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
        '0000180a-0000-1000-8000-00805f9b34fb'  // Device Information
      ];

      const foundDevices: BleDevice[] = [];

      // Start scanning for devices
      await BleClient.requestLEScan(
        {
          services: thermalPrinterServices,
          allowDuplicates: false
        },
        (result) => {
          const device = result.device;
          console.log(`Found device: ${device.name || device.deviceId}`);
          
          // Filter for likely printer devices
          if (device.name && (
            device.name.toLowerCase().includes('thermal') ||
            device.name.toLowerCase().includes('printer') ||
            device.name.toLowerCase().includes('pos') ||
            device.name.toLowerCase().includes('mtp') ||
            device.name.toLowerCase().includes('epson') ||
            device.name.toLowerCase().includes('star') ||
            device.name.toLowerCase().includes('bixolon') ||
            device.name.toLowerCase().includes('citizen')
          )) {
            foundDevices.push(device);
          }
        }
      );

      // Scan for 8 seconds
      await new Promise(resolve => setTimeout(resolve, 8000));
      await BleClient.stopLEScan();

      if (foundDevices.length === 0) {
        // If no named printers found, scan for any available devices
        console.log('🔍 No named printers found, scanning for all devices...');
        
        await BleClient.requestLEScan(
          {},
          (result) => {
            foundDevices.push(result.device);
          }
        );

        await new Promise(resolve => setTimeout(resolve, 5000));
        await BleClient.stopLEScan();
      }

      if (foundDevices.length === 0) {
        throw new Error('Tidak ditemukan perangkat Bluetooth. Pastikan printer sudah dalam mode pairing.');
      }

      console.log(`Found ${foundDevices.length} devices`);

      // Try to connect to the first available device
      for (const device of foundDevices) {
        try {
          console.log(`Trying to connect to: ${device.name || device.deviceId}`);
          await this.connectToDevice(device);
          return true;
        } catch (error) {
          console.warn(`Failed to connect to ${device.name || device.deviceId}:`, error);
          continue;
        }
      }

      throw new Error('Tidak dapat terhubung ke printer manapun');
    } catch (error: any) {
      console.error('❌ Scan and connect failed:', error);
      return false;
    }
  }

  private async connectToDevice(device: BleDevice): Promise<void> {
    try {
      // Connect to device
      await BleClient.connect(device.deviceId, (deviceId) => {
        console.log('Device disconnected:', deviceId);
        this.device = null;
        this.serviceUuid = '';
        this.characteristicUuid = '';
      });

      console.log(`✅ Connected to: ${device.name || device.deviceId}`);
      this.device = device;

      // Discover services and characteristics
      const services = await BleClient.getServices(device.deviceId);
      console.log(`Found ${services.length} services`);

      // Look for writable characteristics
      for (const service of services) {
        try {
          for (const characteristic of service.characteristics) {
            const canWrite = characteristic.properties.write || 
                           characteristic.properties.writeWithoutResponse;
            
            if (canWrite) {
              this.serviceUuid = service.uuid;
              this.characteristicUuid = characteristic.uuid;
              console.log(`✅ Using writable characteristic: ${characteristic.uuid}`);
              return;
            }
          }
        } catch (error) {
          console.warn(`Error checking service ${service.uuid}:`, error);
        }
      }

      throw new Error('Tidak ditemukan characteristic yang dapat ditulis');
    } catch (error) {
      // Clean up on failure
      if (this.device) {
        try {
          await BleClient.disconnect(this.device.deviceId);
        } catch (e) {
          console.warn('Error disconnecting on failure:', e);
        }
      }
      this.device = null;
      this.serviceUuid = '';
      this.characteristicUuid = '';
      throw error;
    }
  }

  async print(text: string): Promise<boolean> {
    if (!this.device || !this.serviceUuid || !this.characteristicUuid) {
      console.log('Not connected, attempting to connect...');
      const connected = await this.scanAndConnect();
      if (!connected) {
        return false;
      }
    }

    try {
      // ESC/POS commands for thermal printing
      const ESC = '\x1B';
      const GS = '\x1D';
      
      // Build the complete command string
      let commands = '';
      commands += ESC + '@'; // Initialize printer
      commands += ESC + 'a' + '\x01'; // Center align
      commands += text; // Print text
      commands += '\n\n\n'; // Add some line feeds
      commands += GS + 'V' + '\x42' + '\x00'; // Partial cut
      
      // Convert to DataView for BLE transmission
      const dataView = textToDataView(commands);
      
      // Send data in chunks for better reliability
      const chunkSize = 20; // Small chunks for BLE reliability
      const totalLength = dataView.byteLength;
      
      console.log(`📤 Sending ${totalLength} bytes in chunks of ${chunkSize}`);
      
      for (let offset = 0; offset < totalLength; offset += chunkSize) {
        const end = Math.min(offset + chunkSize, totalLength);
        const chunk = new DataView(dataView.buffer, offset, end - offset);
        
        await BleClient.write(
          this.device!.deviceId,
          this.serviceUuid,
          this.characteristicUuid,
          chunk
        );
        
        // Small delay between chunks for stability
        if (end < totalLength) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      console.log('✅ Print command sent successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to print:', error);
      
      // Try to reconnect on error
      try {
        await this.disconnect();
        const reconnected = await this.scanAndConnect();
        if (reconnected) {
          console.log('Reconnected, retrying print...');
          return await this.print(text);
        }
      } catch (reconnectError) {
        console.error('Failed to reconnect:', reconnectError);
      }
      
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await BleClient.disconnect(this.device.deviceId);
        console.log('✅ Disconnected from printer');
      } catch (error) {
        console.warn('Error during disconnect:', error);
      }
    }
    
    this.device = null;
    this.serviceUuid = '';
    this.characteristicUuid = '';
  }

  isConnected(): boolean {
    return this.device !== null && this.serviceUuid !== '' && this.characteristicUuid !== '';
  }

  getDeviceInfo(): { name: string; id: string } | null {
    if (!this.device) return null;
    return {
      name: this.device.name || 'Unknown Device',
      id: this.device.deviceId
    };
  }
}

export const mobileThermalPrinter = new MobileThermalPrinter();