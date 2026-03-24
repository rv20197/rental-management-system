import { Response } from 'express';
import PDFDocument from 'pdfkit';

export const generateRentalPDF = (billing: any, res: Response) => {
    const isEstimation = billing.returnedQuantity === null || billing.returnedQuantity === undefined;
    const docTitle = isEstimation ? 'Rental Estimation' : 'Rental Bill';

    const doc = new PDFDocument({ margin: 50 });
    const rightEdge = doc.page.width - 50;

    const sellerCompany = process.env.FROM_NAME || 'Rental Management';

    const customer = billing.Rental?.Customer || billing.Customer;
    const customerName = customer ? `${customer.firstName}_${customer.lastName}` : 'Customer';
    const dateStr = new Date(billing.createdAt || new Date()).toISOString().split('T')[0];
    const type = isEstimation ? 'Estimate' : 'Bill';
    const filename = `${customerName}_${dateStr}_${type}.pdf`.replace(/\s+/g, '_');

    // HTTP headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    doc.pipe(res);

    // Bill Header
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text(docTitle, 50, 57)
      .fontSize(10)
      .text(`Seller's Company: ${sellerCompany}`, 200, 65, { align: 'right' })
      .moveDown()
      .text('Seller\'s Address: Gala.no. 08, Haria Industrial Estate, Behind Universal Petrol Pump, Next to Capitol Hotel, Majiwada, Thane (W) - 400608.', 200, 80, { align: 'right' })
      .moveDown()
      .text('Seller\'s Phone: +91-9821509815', 200, 110, { align: 'right' })
      .moveDown();

    // Horizontal Line
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, 130)
      .lineTo(rightEdge, 130)
      .stroke();

    // Bill Information
    const item = billing.Rental?.Item;

    doc
      .fontSize(10)
      .text(isEstimation ? `Estimation Number: ${billing.id}` : `Bill Number: ${billing.id}`, 50, 145)
      .text(isEstimation ? `Estimation Date: ${new Date(billing.createdAt).toLocaleDateString()}` : `Bill Date: ${new Date(billing.createdAt).toLocaleDateString()}`, 50, 160)
      .text(`Due Date: ${new Date(billing.dueDate).toLocaleDateString()}`, 50, 175)
      .text(`Status: ${billing.status.toUpperCase()}`, 50, 190)

      .text('Customer Details:', 300, 145)
      .text(`Name: ${customer ? `${customer.firstName} ${customer.lastName}` : 'N/A'}`, 300, 160)
      .text(`Email: ${customer ? customer.email : 'N/A'}`, 300, 175)
      .text(`Phone: ${customer ? customer.phone : 'N/A'}`, 300, 190)
      .text(`Delivery Address: ${customer && customer.address ? customer.address : 'N/A'}`, 300, 205, { width: rightEdge - 300 })
      .moveDown();

    // Table Header
    const tableTop = 250;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Item', 50, tableTop)
      .text('Monthly Rate / Price', 225, tableTop)
      .text('Quantity', 390, tableTop)
      .text('Total Amount', 470, tableTop, { align: 'right', width: rightEdge - 470 })
      .font('Helvetica');

    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, tableTop + 15)
      .lineTo(rightEdge, tableTop + 15)
      .stroke();

    // Table Content
    let rowY = tableTop + 30;
    
    if (billing.BillingItems && billing.BillingItems.length > 0) {
      billing.BillingItems.forEach((bi: any) => {
        const itemName = bi.Item?.name || 'Unknown Item';
        doc
          .text(itemName, 50, rowY)
          .text(`Rs.${parseFloat(bi.rate).toFixed(2)}`, 225, rowY)
          .text(`${bi.quantity}`, 390, rowY)
          .text(`Rs.${parseFloat(bi.total).toFixed(2)}`, 470, rowY, { align: 'right', width: rightEdge - 470 });
        rowY += 20;
      });
    } else {
      const item = billing.Rental?.Item;
      const qty = isEstimation ? (billing.Rental?.quantity ?? 0) : (billing.returnedQuantity ?? 0);
      doc
        .text(item ? item.name : 'Unknown Item', 50, rowY)
        .text(item ? `Rs.${parseFloat(item.monthlyRate).toFixed(2)}` : 'Rs.0.00', 225, rowY)
        .text(`${qty}`, 390, rowY)
        .text(`Rs.${parseFloat(billing.amount).toFixed(2)}`, 470, rowY, { align: 'right', width: rightEdge - 470 });
      rowY += 20;
    }

    // Damages Section
    if (billing.BillingDamages && billing.BillingDamages.length > 0) {
      rowY += 10;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .fillColor('#ff0000')
        .text('Damages & Deductions', 50, rowY)
        .font('Helvetica')
        .fillColor('#444444');
      rowY += 15;
      
      billing.BillingDamages.forEach((bd: any) => {
        doc
          .text(bd.description, 50, rowY)
          .text(`Rs.${parseFloat(bd.amount).toFixed(2)}`, 470, rowY, { align: 'right', width: rightEdge - 470 });
        rowY += 15;
      });
    }

    // Footer
    const footerY = Math.max(rowY + 30, 400);
    doc
      .strokeColor('#aaaaaa')
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(rightEdge, footerY)
      .stroke();

    let finalY = footerY + 15;

    // Detailed Breakdown in Footer if Damages exist
    if (Number(billing.totalDamages) > 0) {
      doc.fontSize(9);
      const subtotal = Number(billing.amount) - Math.max(0, Number(billing.totalDamages) - Number(billing.availableDeposit || 0));
      doc.text(`Items Subtotal: Rs.${subtotal.toFixed(2)}`, 350, finalY, { align: 'right', width: rightEdge - 350 });
      finalY += 12;
      doc.text(`Total Damages: Rs.${parseFloat(billing.totalDamages).toFixed(2)}`, 350, finalY, { align: 'right', width: rightEdge - 350 });
      finalY += 12;
      
      if (billing.rentalId) {
        doc.text(`Deposit Used: -Rs.${parseFloat(billing.depositUsed).toFixed(2)}`, 350, finalY, { align: 'right', width: rightEdge - 350 });
        finalY += 12;
      }
      finalY += 5;
    }

    doc
      .fontSize(15)
      .font('Helvetica-Bold')
      .text(`Total Due: Rs.${parseFloat(billing.amount).toFixed(2)}`, 50, finalY, { align: 'right' });

    if (billing.status === 'paid' && billing.paymentDate) {
      doc
        .fontSize(10)
        .fillColor('green')
        .text(`Paid on: ${new Date(billing.paymentDate).toLocaleDateString()}`, 50, footerY + 20);
    }

    doc.end();
};
