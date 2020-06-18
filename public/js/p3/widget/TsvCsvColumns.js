define([], function() {
    return {
    // return colunn names for Variation Analysis service
    variationColumns: {
        rowNumber: {label: "Row Number", field: 'RowNumber', hidden: true},
        sample: {label: 'Sample', field: 'Sample'},
        contig: {label: 'Contig', field: 'Contig'},
        pos: {label: 'Pos', field: 'Pos'},
        ref: {label: 'Ref', field: 'Ref'},
        variation: {label: 'Var', field: 'Var'},
        score: {label: 'Score', field: 'Score'},
        var_cov: {label: 'Var Cov', field: 'Var_cov'},
        var_frac: {label: 'Var Frac', field: 'Var_frac'},
        ref_nt: {label: 'Ref nt', field: 'Ref_nt'},
        var_nt: {label: 'Var nt', field: 'Var_nt'},
        ref_nt_pos_change: {label: 'Ref nt pos change', field: 'Ref_nt_pos_change'},
        ref_aa_pos_change: {label: 'Ref aa pos change', field: 'Ref_aa_pos_change'},
        frameshift: {label: 'Frameshift', field: 'Frameshift'},
        gene_id: {label: 'Gene ID', field: 'Gene_ID'},
        locus_tag: {label: 'Locus Tag', field: 'Locus_tag'},
        gene_name: {label: 'Gene Name', field: 'Gene_name'},
        funct: {label: 'Function', field: 'Function'},
        upstream_feature: {label: 'Upstream Feature', field: 'Upstream_feature'},
        downstream_feature: {label: 'Downstream Feature', field: 'Downstream_feature'},
        snpeff_type: {label: 'snpEff Type', field: 'snpEff_type'},
        snpeff_impact: {label: 'snpEff Impact', field: 'snpEff_impact'}
        }
    }

});