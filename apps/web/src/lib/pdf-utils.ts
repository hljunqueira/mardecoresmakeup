import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Tipos para melhor IntelliSense
interface AutoTableOptions {
  startY?: number;
  head?: any[][];
  body?: any[][];
  theme?: string;
  styles?: any;
  headStyles?: any;
  columnStyles?: any;
  margin?: any;
  didParseCell?: (data: any) => void;
}

export class PDFGenerator {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  addHeader(title: string, subtitle?: string) {
    const pageWidth = this.doc.internal.pageSize.width;
    
    // Header
    this.doc.setFontSize(20);
    this.doc.setTextColor(15, 118, 110); // Petrol color
    this.doc.text(title, pageWidth / 2, 30, { align: 'center' });
    
    if (subtitle) {
      this.doc.setFontSize(12);
      this.doc.setTextColor(100);
      this.doc.text(subtitle, pageWidth / 2, 40, { align: 'center' });
    }
    
    this.doc.setFontSize(12);
    this.doc.setTextColor(100);
    this.doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 50, { align: 'center' });
    
    // Linha separadora
    this.doc.setLineWidth(0.5);
    this.doc.setDrawColor(15, 118, 110);
    this.doc.line(20, 55, pageWidth - 20, 55);
    
    return 70; // Retorna a posição Y inicial para o conteúdo
  }

  addMetrics(metrics: string[][], yPos: number): number {
    this.doc.setFontSize(14);
    this.doc.setTextColor(0);
    this.doc.text('Métricas Principais', 20, yPos);
    
    yPos += 15;
    this.doc.setFontSize(11);
    
    metrics.forEach(([label, value]) => {
      this.doc.text(label, 20, yPos);
      this.doc.text(value, 100, yPos);
      yPos += 10;
    });
    
    return yPos + 10;
  }

  addTable(options: AutoTableOptions): number {
    try {
      (this.doc as any).autoTable(options);
      return (this.doc as any).lastAutoTable.finalY + 15;
    } catch (error) {
      console.error('Erro ao adicionar tabela:', error);
      return options.startY || 0 + 50;
    }
  }

  addFooter() {
    const totalPages = this.doc.getNumberOfPages();
    const pageHeight = this.doc.internal.pageSize.height;
    const pageWidth = this.doc.internal.pageSize.width;
    
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(150);
      this.doc.text(
        `Mar de Cores - Sistema de Gestão | Página ${i} de ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  }

  save(filename: string) {
    this.addFooter();
    this.doc.save(filename);
  }

  addNewPageIfNeeded(currentY: number, requiredSpace: number = 50): number {
    const pageHeight = this.doc.internal.pageSize.height;
    if (currentY > pageHeight - requiredSpace) {
      this.doc.addPage();
      return 30;
    }
    return currentY;
  }
}

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};