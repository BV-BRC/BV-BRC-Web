/**
 * @module p3/widget/copilot/data/SuggestedQuestions
 * @description Hardcoded suggested questions for the Copilot chat interface.
 * This module contains all available suggested questions that can be randomly
 * selected and displayed to users when starting a new chat session.
 */

define([
  'dojo/_base/declare'
], function (
  declare
) {
  /**
   * All available suggested questions organized by category.
   * These questions are randomly selected and displayed when a new chat is opened.
   *
   * @type {Array<string>}
   */
  var allSuggestedQuestions = [
    // Platform Overview
    'What is BV-BRC?',
    'What data types are available in BV-BRC?',
    'What organisms and pathogens are supported in BV-BRC?',
    'What analysis tools and services are available in BV-BRC?',
    'List all analysis tools and services available in BV-BRC.',
    'List all visualization tools available in BV-BRC.',

    // User-Specific Guidance
    'I am an infectious disease researcher. How can I use BV-BRC for my work?',
    'I am a microbiologist. How can I use BV-BRC for my work?',
    'I am a computational biologist. How can I use BV-BRC for my work?',
    'I am a bioinformatician. How can I use BV-BRC for my work?',
    'I am an epidemiologist. How can I use BV-BRC for my work?',
    'I am a public health researcher. How can I use BV-BRC for my work?',
    'I am an educator. How can I use BV-BRC for my work?',
    'I am a student. How can I use BV-BRC for my work?',

    // Analysis Workflows
    'How do I analyze a bacterial genome?',
    'How do I analyze a viral genome?',
    'How do I analyze a genome starting with reads?',
    'How do I analyze a bacterial genome starting with contigs?',
    'How do I analyze a metagenomic sample?',
    'How do I analyze a transcriptomics sample?',
    'How do I perform comparative genomic analysis?',
    'Describe a complete workflow for analyzing a clinical metagenomic sample using various analysis tools and services in BV-BRC.',
    'How do I analyze protein structures in BV-BRC?',

    // Services and Tools
    'Describe the genome assembly service.',
    'Describe the genome annotation service.',
    'Describe the taxonomic classification service and its applications in research.',
    'Describe the metagenomic binning service and its applications.',
    'Describe the Meta-CATS service.',
    'Describe AMR data in BV-BRC and how it can be used for infectious disease research.',
    'Describe genome metadata available in BV-BRC.',
    'What are genomic features and what feature types are there?',
    'Describe specialty genes and their usage in infectious disease research.',
    'Describe surveillance data available in BV-BRC.',

    // Data Exploration
    'Taxa: Summarize this taxa.',
    'Taxa: Describe this organism and its relevance to public health.',
    'Taxa: List key virulence factors and AMR genes.',
    'Taxa: List primary drugs used to treat this pathogen.',
    'Genome: Summarize this genome.',
    'Genome: Is there anything special or unique about this genome?',
    'Genome: What can you tell about this genome based on scientific literature and experimental evidence?',
    'Gene: Describe this gene and its function.',
    'Gene: Describe the function of this gene and its importance.',
    'Gene: Describe the function of this gene and its relevance to virulence and AMR.',
    'Gene: Assign potential function to this gene based on literature and experimental evidence.',

    // Interface and Navigation
    'Describe this page.',
    'Describe the table columns and filters in detail.',
    'Describe the submission.',
    'Describe the submission form and parameters in detail.',
    'Follow-up question: Describe an attribute / filter / parameter.',
    'Describe the job results files.',

    // Basic Operations
    'How do I navigate and search within this website?',
    'How do I perform a BLAST search?',
    'How do I upload data to my workspace?',
    'How do I compare genomes?',
    'How do I visualize phylogenetic trees?',
    'How do I use the Genome Annotation Service?'
  ];

  return {
    /**
     * Returns all available suggested questions
     * @returns {Array<string>} Array of all suggested questions
     */
    getAllSuggestedQuestions: function() {
      return allSuggestedQuestions;
    }
  };
});
