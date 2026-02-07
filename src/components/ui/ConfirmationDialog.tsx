import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info" | "success";
  loading?: boolean;
  showCancel?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "danger",
  loading = false,
  showCancel = true,
}: ConfirmationDialogProps) {
  
  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />;
      case "warning":
        return <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />;
      case "success":
        return <CheckCircle className="w-12 h-12 text-green-500 mb-4" />;
      default:
        return <Info className="w-12 h-12 text-blue-500 mb-4" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center pt-4 pb-2">
        {getIcon()}
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
        {description && (
          <p className="text-slate-500 mb-8 max-w-sm">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-center gap-3 w-full">
          {showCancel && (
            <Button 
              variant="outline" 
              onClick={onClose} 
              disabled={loading}
              className="w-full"
            >
              {cancelText}
            </Button>
          )}
          <Button 
            variant="primary"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full ${variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {loading ? "Processando..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
