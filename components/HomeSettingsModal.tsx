import React from 'react';
import { WebsiteSettingsModal, WebsiteSettingsModalProps } from './WebsiteSettingsModal';

export const HomeSettingsModal: React.FC<WebsiteSettingsModalProps> = (props) => {
  return <WebsiteSettingsModal {...props} />;
};

export { WebsiteSettingsModal };
export default HomeSettingsModal;
