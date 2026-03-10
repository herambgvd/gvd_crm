import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBOQ } from "../api";
import { fetchLead } from "../../leads/api";
import { fetchDefaultTemplate } from "../../settings/api";
import { Layout } from "../../../components";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { ArrowLeft, Download, Printer, Share } from "lucide-react";
import { format } from "date-fns";

const BOQViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: boq, isLoading: isLoadingBOQ } = useQuery({
    queryKey: ["boq", id],
    queryFn: () => fetchBOQ(id),
  });

  const { data: lead } = useQuery({
    queryKey: ["lead", boq?.lead_id],
    queryFn: () => fetchLead(boq.lead_id),
    enabled: !!boq?.lead_id,
  });

  const { data: boqTemplate } = useQuery({
    queryKey: ["defaultTemplate", "boq"],
    queryFn: () => fetchDefaultTemplate("boq"),
    retry: false,
  });

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount || 0);
  };

  if (isLoadingBOQ) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!boq) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">BOQ not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 print:max-w-none">
        {/* Action Bar - Hidden when printing */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => window.close()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              onClick={() =>
                navigate(`/boqs/edit/${id}${lead ? `?lead_id=${lead.id}` : ""}`)
              }
            >
              Edit BOQ
            </Button>
          </div>
        </div>

        {/* BOQ Document */}
        <Card className="border-0 shadow-lg print:shadow-none print:border-t">
          <CardContent className="p-0">
            <div className="bg-white p-0 print:p-0 print:shadow-none">
              {/* Header */}
              <div className="mb-8">
                {boqTemplate?.header_image_url ? (
                  <div className="w-full mb-6">
                    <img
                      src={`${
                        process.env.REACT_APP_BACKEND_URL ||
                        "http://localhost:8000"
                      }${boqTemplate.header_image_url}`}
                      alt="Company Header"
                      className="w-full h-32 object-cover"
                    />
                  </div>
                ) : (
                  <div className="text-center p-8 bg-gray-50 mb-6">
                    <h1 className="text-4xl font-bold text-gray-900">
                      {boqTemplate?.company_name || "Your Company Name"}
                    </h1>
                    {boqTemplate?.company_address && (
                      <p className="text-sm text-gray-600 mt-3">
                        {boqTemplate.company_address}
                      </p>
                    )}
                  </div>
                )}

                <div className="px-8">
                  <div className="flex justify-between items-center border-b-2 border-gray-200 pb-4">
                    <div>{/* Empty space for balance */}</div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Date: {new Date().toLocaleDateString()}
                      </p>
                      {boq.boq_number && (
                        <p className="text-sm text-gray-600 mt-1">
                          {boq.boq_number}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* From/To Section */}
                  {(boq.from_data || boq.to_data) && (
                    <div className="grid grid-cols-2 gap-8 mt-6 mb-6">
                      {/* From Section */}
                      {boq.from_data &&
                        Object.keys(boq.from_data).length > 0 && (
                          <div>
                            <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">
                              FROM:
                            </h3>
                            <div className="text-sm text-gray-700 space-y-1">
                              {boq.from_data.company_name && (
                                <p className="font-semibold">
                                  {boq.from_data.company_name}
                                </p>
                              )}
                              {boq.from_data.address && (
                                <p>{boq.from_data.address}</p>
                              )}
                              {boq.from_data.phone && (
                                <p>Phone: {boq.from_data.phone}</p>
                              )}
                              {boq.from_data.email && (
                                <p>Email: {boq.from_data.email}</p>
                              )}
                              {boq.from_data.website && (
                                <p>Website: {boq.from_data.website}</p>
                              )}
                              {boq.from_data.gst && (
                                <p>GST: {boq.from_data.gst}</p>
                              )}
                            </div>
                          </div>
                        )}

                      {/* To Section */}
                      {boq.to_data && Object.keys(boq.to_data).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800 mb-3 border-b pb-1">
                            TO:
                          </h3>
                          <div className="text-sm text-gray-700 space-y-1">
                            {boq.to_data.company_name && (
                              <p className="font-semibold">
                                {boq.to_data.company_name}
                              </p>
                            )}
                            {boq.to_data.address && (
                              <p>{boq.to_data.address}</p>
                            )}
                            {boq.to_data.phone && (
                              <p>Phone: {boq.to_data.phone}</p>
                            )}
                            {boq.to_data.email && (
                              <p>Email: {boq.to_data.email}</p>
                            )}
                            {boq.to_data.gst && <p>GST: {boq.to_data.gst}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="px-8 mb-8">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        S.No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Item
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Description
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Qty/Unit
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {boq.items && boq.items.length > 0 ? (
                      boq.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 border">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 border w-1/6">
                            <p className="text-sm font-medium text-gray-900">
                              {item.product_code
                                ? `${item.product_code} - ${
                                    item.item_name || "Unnamed Item"
                                  }`
                                : item.item_name || "Unnamed Item"}
                            </p>
                          </td>
                          <td className="px-4 py-3 border w-2/5">
                            <div>
                              {item.description && (
                                <p className="text-xs text-gray-600 mb-2">
                                  {item.description}
                                </p>
                              )}
                              {item.specifications &&
                                item.specifications.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.specifications.map(
                                      (spec, specIndex) => (
                                        <span
                                          key={specIndex}
                                          className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded"
                                        >
                                          {spec}
                                        </span>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-center border">
                            {item.quantity || 0} {item.unit || "Nos"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right border">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right border">
                            {formatCurrency(item.total_price)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-4 py-8 text-center text-gray-500 border"
                        >
                          No items added to BOQ yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Section */}
              <div className="px-8 flex justify-end mb-8">
                <div className="w-64">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium">
                        {formatCurrency(boq.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-gray-600">
                        Tax ({boq.tax_percentage || 0}%):
                      </span>
                      <span className="text-sm font-medium">
                        {formatCurrency(boq.tax_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 pt-3 border-t-2">
                      <span className="text-lg font-bold text-gray-900">
                        Total:
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(boq.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              {boqTemplate?.terms_and_conditions && (
                <div className="px-8 mb-6">
                  <div className="border-t-2 border-gray-200 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                      Terms & Conditions:
                    </h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      {boqTemplate.terms_and_conditions
                        .split("\n")
                        .map((term, index) => (
                          <p key={index}>{term}</p>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Footer */}
              {boqTemplate?.footer_image_url ? (
                <div className="w-full mt-8">
                  <img
                    src={`${
                      process.env.REACT_APP_BACKEND_URL ||
                      "http://localhost:8000"
                    }${boqTemplate.footer_image_url}`}
                    alt="Company Footer"
                    className="w-full h-auto max-h-32 object-contain"
                  />
                </div>
              ) : boqTemplate?.company_phone || boqTemplate?.company_email ? (
                <div className="bg-gray-50 p-6 mt-8 text-center text-sm text-gray-600">
                  <div className="flex justify-center space-x-8">
                    {boqTemplate.company_phone && (
                      <p className="flex items-center">
                        <span className="font-semibold">Phone:</span>{" "}
                        <span className="ml-1">
                          {boqTemplate.company_phone}
                        </span>
                      </p>
                    )}
                    {boqTemplate.company_email && (
                      <p className="flex items-center">
                        <span className="font-semibold">Email:</span>{" "}
                        <span className="ml-1">
                          {boqTemplate.company_email}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 mt-8 text-center text-sm text-gray-600">
                  <p>Thank you for your business!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          @page {
            margin: 0.25in;
            size: A4;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            font-size: 12px;
          }

          table {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .px-8 {
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }

          .py-3 {
            padding-top: 0.5rem !important;
            padding-bottom: 0.5rem !important;
          }

          .px-4 {
            padding-left: 0.75rem !important;
            padding-right: 0.75rem !important;
          }

          .text-4xl {
            font-size: 1.875rem !important;
          }

          .text-xl {
            font-size: 1.125rem !important;
          }

          .text-lg {
            font-size: 1rem !important;
          }

          .mb-8 {
            margin-bottom: 1.5rem !important;
          }

          .mb-6 {
            margin-bottom: 1rem !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:shadow-none {
            box-shadow: none !important;
          }

          .print\\:bg-white {
            background-color: white !important;
          }

          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }

          .print\\:text-black {
            color: black !important;
          }

          .print\\:border-t {
            border-top: 1px solid #000 !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default BOQViewer;
