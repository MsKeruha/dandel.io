import React from 'react';
import CriteriaSelector from '../CriteriaSelector/CriteriaSelector';
import Icon from '../common/Icon';
import './CreateDeliveryModal.css';

interface Props {
  onClose: () => void;
}

export const CreateDeliveryModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div className="delivery-modal-overlay fade-in">
      <div className="delivery-modal-content glass-card slide-up">
        <button className="delivery-modal-close" onClick={onClose} title="Закрити вікно">
          <Icon name="x" size={24} />
        </button>
        <div className="delivery-modal-header">
          <h2>Оформлення нової доставки</h2>
          <p>Введіть дані вантажу та оберіть оптимальний SAW-сценарій</p>
        </div>
        <div className="delivery-modal-body">
          <CriteriaSelector onComplete={onClose} />
        </div>
      </div>
    </div>
  );
};

export default CreateDeliveryModal;
