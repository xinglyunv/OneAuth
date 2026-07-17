package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/ent/device"
	"github.com/identity-platform/internal/ent/session"
)

type DeviceManager struct {
	db *ent.Client
}

func NewDeviceManager(db *ent.Client) *DeviceManager {
	return &DeviceManager{db: db}
}

func (m *DeviceManager) List(ctx context.Context, userID uuid.UUID) ([]*ent.Device, error) {
	return m.db.Device.Query().
		Where(device.UserID(userID)).
		Order(ent.Desc("last_seen_at")).
		All(ctx)
}

func (m *DeviceManager) Delete(ctx context.Context, userID, deviceID uuid.UUID) error {
	n, err := m.db.Device.Delete().
		Where(
			device.ID(deviceID),
			device.UserID(userID),
		).
		Exec(ctx)
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("device not found")
	}

	_, err = m.db.Session.Update().
		Where(
			session.DeviceID(deviceID),
			session.StatusEQ(session.StatusActive),
		).
		SetStatus(session.StatusRevoked).
		Save(ctx)
	return err
}

func (m *DeviceManager) LogoutAll(ctx context.Context, userID uuid.UUID) (int, error) {
	n, err := m.db.Session.Update().
		Where(
			session.UserID(userID),
			session.StatusEQ(session.StatusActive),
		).
		SetStatus(session.StatusRevoked).
		Save(ctx)
	return n, err
}

func (m *DeviceManager) GetDeviceByFingerprint(ctx context.Context, userID uuid.UUID, fingerprint string) (*ent.Device, error) {
	devices, err := m.db.Device.Query().
		Where(
			device.UserID(userID),
			device.Fingerprint(fingerprint),
		).
		All(ctx)
	if err != nil {
		return nil, err
	}
	if len(devices) == 0 {
		return nil, nil
	}
	return devices[0], nil
}

func (m *DeviceManager) Upsert(ctx context.Context, userID uuid.UUID, fingerprint, name, platform, browser, ip string) (*ent.Device, error) {
	existing, err := m.GetDeviceByFingerprint(ctx, userID, fingerprint)
	if err != nil {
		return nil, err
	}

	if existing != nil {
		update := m.db.Device.UpdateOneID(existing.ID).
			SetLastIP(ip).
		SetLastSeenAt(time.Now())
	if name != "" {
		update = update.SetName(name)
	}
	if platform != "" {
		update = update.SetPlatform(platform)
	}
	if browser != "" {
		update = update.SetBrowser(browser)
	}
	return update.Save(ctx)
	}

	return m.db.Device.Create().
		SetUserID(userID).
		SetFingerprint(fingerprint).
		SetName(name).
		SetPlatform(platform).
		SetBrowser(browser).
		SetLastIP(ip).
		SetLastSeenAt(time.Now()).
		Save(ctx)
}
