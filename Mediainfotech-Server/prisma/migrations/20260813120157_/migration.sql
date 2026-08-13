-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "earlyExitMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isEarlyExit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lateGracePeriod" INTEGER DEFAULT 15,
ADD COLUMN     "shiftEndTime" TEXT DEFAULT '18:30',
ADD COLUMN     "shiftStartTime" TEXT DEFAULT '09:30',
ADD COLUMN     "workDays" TEXT DEFAULT 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY';

-- CreateTable
CREATE TABLE "AttendanceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "officeLat" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "officeLng" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "geofenceRadius" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
    "geofenceMode" TEXT NOT NULL DEFAULT 'AUTO',
    "autoApproveWithinGeofence" BOOLEAN NOT NULL DEFAULT true,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT true,
    "allowRemoteCheckIn" BOOLEAN NOT NULL DEFAULT true,
    "officeStartTime" TEXT NOT NULL DEFAULT '09:30',
    "officeEndTime" TEXT NOT NULL DEFAULT '18:30',
    "lateThresholdMinutes" INTEGER NOT NULL DEFAULT 15,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSettings_pkey" PRIMARY KEY ("id")
);
