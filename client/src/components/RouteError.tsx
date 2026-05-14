import {useRouteError, isRouteErrorResponse, useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {AlertCircle, ArrowLeft} from 'lucide-react';

export function RouteError() {
    const error = useRouteError();
    const {t} = useTranslation();
    const navigate = useNavigate();

    const message = isRouteErrorResponse(error)
        ? error.statusText
        : error instanceof Error
            ? error.message
            : t('errors.unknown');

    return (
        <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-20 text-center">
            <AlertCircle size={40} className="text-muted"/>
            <p className="text-sm text-muted">{message}</p>
            <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted transition hover:text-fg"
            >
                <ArrowLeft size={14}/> {t('common.back')}
            </button>
        </div>
    );
}
