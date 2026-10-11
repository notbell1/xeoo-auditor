import React from "react";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Link } from "../app/router";
import { Button } from "../components/common";
import { PublicLayout } from "../layouts/PublicLayout";

export const NotFoundPage: React.FC = () => {
  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-16rem)] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex items-center justify-center size-20 rounded-2xl bg-slate-100 border border-slate-200 text-slate-500 shadow-xs mx-auto">
            <FileQuestion className="size-10 text-slate-600" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-wider uppercase text-blue-600">
              404
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              Page Not Found
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              The page you are looking for does not exist, has expired, or is restricted.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link to="/">
              <Button
                variant="primary"
                size="md"
                leftIcon={<ArrowLeft className="size-4" />}
                className="shadow-sm"
              >
                Back to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
