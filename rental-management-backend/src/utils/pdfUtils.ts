import { Response } from 'express';
import PDFDocument from 'pdfkit';

export const generateRentalPDF = (billing: any, res: Response) => {
    const isEstimation = billing.returnedQuantity === null || billing.returnedQuantity === undefined;
    const docTitle = isEstimation ? 'Rental Estimation' : 'Rental Bill';

    const doc = new PDFDocument({ margin: 50 });

    // HTTP headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${isEstimation ? 'estimation' : 'bill'}-${billing.id}.pdf`);

    doc.pipe(res);

    // Bill Header
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text(docTitle, 110, 57)
      .fontSize(10)
      .text('123 Rental St, City, State, 12345', 200, 65, { align: 'right' })
      .text('Phone: (123) 456-7890', 200, 80, { align: 'right' })
      .moveDown();

    // Horizontal Line
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, 115)
      .lineTo(550, 115)
      .stroke();

    // Bill Information
    const customer = billing.Rental?.Customer;
    const item = billing.Rental?.Item;

    doc
      .fontSize(10)
      .text(isEstimation ? `Estimation Number: ${billing.id}` : `Bill Number: ${billing.id}`, 50, 130)
      .text(isEstimation ? `Estimation Date: ${new Date(billing.createdAt).toLocaleDateString()}` : `Bill Date: ${new Date(billing.createdAt).toLocaleDateString()}`, 50, 145)
      .text(`Due Date: ${new Date(billing.dueDate).toLocaleDateString()}`, 50, 160)
      .text(`Status: ${billing.status.toUpperCase()}`, 50, 175)

      .text('Customer Details:', 300, 130)
      .text(`Name: ${customer ? `${customer.firstName} ${customer.lastName}` : 'N/A'}`, 300, 145)
      .text(`Email: ${customer ? customer.email : 'N/A'}`, 300, 160)
      .text(`Phone: ${customer ? customer.phone : 'N/A'}`, 300, 175)
      .moveDown();

    // Table Header
    const tableTop = 230;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Item', 50, tableTop)
      .text('Monthly Rate', 200, tableTop)
      .text(isEstimation ? 'Qty Rented' : 'Qty Returned', 300, tableTop)
      .text('Total Amount', 450, tableTop, { align: 'right' })
      .font('Helvetica');

    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    // Table Content
    const rowY = tableTop + 30;
    const qty = isEstimation ? (billing.Rental?.quantity ?? 0) : (billing.returnedQuantity ?? 0);
    doc
      .text(item ? item.name : 'Unknown Item', 50, rowY)
      .text(item ? `$${parseFloat(item.monthlyRate).toFixed(2)}` : '$0.00', 200, rowY)
      .text(`${qty}`, 300, rowY)
      .text(`$${parseFloat(billing.amount).toFixed(2)}`, 450, rowY, { align: 'right' });

    // Footer
    const footerY = 400;
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(550, footerY)
      .stroke();

    doc
      .fontSize(15)
      .text(`Total Due: $${parseFloat(billing.amount).toFixed(2)}`, 50, footerY + 20, { align: 'right' });

    if (billing.status === 'paid' && billing.paymentDate) {
      doc
        .fontSize(10)
        .fillColor('green')
        .text(`Paid on: ${new Date(billing.paymentDate).toLocaleDateString()}`, 50, footerY + 20);
    }

    doc.end();
};
