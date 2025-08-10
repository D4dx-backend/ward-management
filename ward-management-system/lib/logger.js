import ActivityLog from '../models/ActivityLog';

export const logActivity = async ({
  userId,
  action,
  description,
  entityType = null,
  entityId = null,
  metadata = {},
  district,
  ward = null,
  ipAddress = null,
  userAgent = null
}) => {
  try {
    // Create log object with only valid fields
    const logData = {
      user: userId,
      action,
      description,
      metadata,
      district: district || 'Unknown',
      ipAddress,
      userAgent
    };

    // Only add entityType if it's not null
    if (entityType) {
      logData.entityType = entityType;
    }

    // Only add entityId if it's not null
    if (entityId) {
      logData.entityId = entityId;
    }

    // Only add ward if it's not null
    if (ward) {
      logData.ward = ward;
    }

    const log = new ActivityLog(logData);

    await log.save();
    return log;
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking main functionality
    return null;
  }
};

export const ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  FORM_SUBMIT: 'FORM_SUBMIT',
  FORM_CREATE: 'FORM_CREATE',
  FORM_UPDATE: 'FORM_UPDATE',
  FORM_DELETE: 'FORM_DELETE',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  WARD_CREATE: 'WARD_CREATE',
  WARD_UPDATE: 'WARD_UPDATE',
  WARD_DELETE: 'WARD_DELETE',
  CLUSTER_CREATE: 'CLUSTER_CREATE',
  CLUSTER_UPDATE: 'CLUSTER_UPDATE',
  CLUSTER_DELETE: 'CLUSTER_DELETE',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_DELETE: 'DOCUMENT_DELETE',
  INSTRUCTION_CREATE: 'INSTRUCTION_CREATE',
  INSTRUCTION_UPDATE: 'INSTRUCTION_UPDATE',
  INSTRUCTION_DELETE: 'INSTRUCTION_DELETE',
  REPORT_VIEW: 'REPORT_VIEW',
  REPORT_EXPORT: 'REPORT_EXPORT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PROFILE_UPDATE: 'PROFILE_UPDATE'
};