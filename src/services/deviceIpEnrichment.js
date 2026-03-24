/**
 * Không phụ thuộc API /api/device/status.
 * Chỉ chuẩn hóa control_url từ ip nếu đã có sẵn.
 */
export async function enrichDeviceWithSerialStatusLookup(device) {
  if (!device || typeof device !== 'object') return device;
  if (device.control_url && String(device.control_url).trim()) return device;
  const ip = device.ip != null ? String(device.ip).trim() : '';
  if (!ip) return device;
  return {
    ...device,
    control_url: `http://${ip}/`,
  };
}

export async function enrichDevicesMissingControlUrl(devices) {
  if (!Array.isArray(devices) || devices.length === 0) return devices;
  return Promise.all(
    devices.map(async (d) => {
      try {
        return await enrichDeviceWithSerialStatusLookup(d);
      } catch {
        return d;
      }
    })
  );
}
