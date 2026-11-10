define([
  'dojo/_base/declare', 'dijit/layout/BorderContainer', 'dojo/on',
  'dojo/dom-class', 'dijit/layout/ContentPane', 'dojo/dom-construct',
  './PageGrid', './formatter', '../store/SurveillanceJsonRest', './GridSelector'
], function (
  declare, BorderContainer, on,
  domClass, ContentPane, domConstruct,
  Grid, formatter, Store, selector
) {

  var store = new Store({});

  return declare([Grid], {
    region: 'center',
    query: (this.query || ''),
    apiToken: window.App.authorizationToken,
    apiServer: window.App.dataAPI,
    store: store,
    dataModel: 'surveillance',
    primaryKey: 'id',
    deselectOnRefresh: true,
    columns: {
      'Selection Checkboxes': selector({ unhidable: true }),

      // Project & Submission Information
      project_identifier: { label: 'Project Identifier', field: 'project_identifier', hidden: true, group: 'Project & Submission Information' },
      contributing_institution: { label: 'Contributing Institution', field: 'contributing_institution', hidden: false, group: 'Project & Submission Information' },
      sample_identifier: { label: 'Sample Identifier', field: 'sample_identifier', hidden: false, group: 'Project & Submission Information' },
      sequence_accession: { label: 'Sequence Accession', field: 'sequence_accession', hidden: true, group: 'Project & Submission Information' },
      submission_date: { label: 'Submission Date', field: 'submission_date', hidden: true, group: 'Project & Submission Information' },
      last_update_date: { label: 'Last Update Date', field: 'last_update_date', hidden: true, group: 'Project & Submission Information' },
      embargo_end_date: { label: 'Embargo End Date', field: 'embargo_end_date', hidden: true, group: 'Project & Submission Information' },
      longitudinal_study: { label: 'Longitudinal Study', field: 'longitudinal_study', hidden: true, group: 'Project & Submission Information' },
      date_inserted: { label: 'Date Inserted', field: 'date_inserted', hidden: true, group: 'Project & Submission Information' },
      date_modified: { label: 'Date Modified', field: 'date_modified', hidden: true, group: 'Project & Submission Information' },
      additional_metadata: { label: 'Additional Metadata', field: 'additional_metadata', hidden: true, group: 'Project & Submission Information' },
      comments: { label: 'Comments', field: 'comments', hidden: true, group: 'Project & Submission Information' },

      // Sample & Specimen Information
      sample_material: { label: 'Sample Material', field: 'sample_material', hidden: false, group: 'Sample & Specimen Information' },
      sample_transport_medium: { label: 'Sample Transport Medium', field: 'sample_transport_medium', hidden: true, group: 'Sample & Specimen Information' },
      sample_receipt_date: { label: 'Sample Receipt Date', field: 'sample_receipt_date', hidden: true, group: 'Sample & Specimen Information' },
      collector_name: { label: 'Collector Name', field: 'collector_name', hidden: true, group: 'Sample & Specimen Information' },
      collector_institution: { label: 'Collector Institution', field: 'collector_institution', hidden: true, group: 'Sample & Specimen Information' },
      contact_email_address: { label: 'Contact Email Address', field: 'contact_email_address', hidden: true, group: 'Sample & Specimen Information' },
      // Collection & Geographic Information
      collection_date: { label: 'Collection Date', field: 'collection_date', hidden: true, group: 'Collection & Geographic Information' },
      collection_year: { label: 'Collection Year', field: 'collection_year', hidden: false, group: 'Collection & Geographic Information' },
      collection_season: { label: 'Collection Season', field: 'collection_season', hidden: true, group: 'Collection & Geographic Information' },
      days_elapsed_to_sample_collection: { label: 'Days Elapsed to Sample Collection', field: 'days_elapsed_to_sample_collection', hidden: true, group: 'Collection & Geographic Information' },
      collection_country: { label: 'Collection Country', field: 'collection_country', hidden: false, group: 'Collection & Geographic Information' },
      collection_state_province: { label: 'Collection State Province', field: 'collection_state_province', hidden: true, group: 'Collection & Geographic Information' },
      collection_city: { label: 'Collection City', field: 'collection_city', hidden: true, group: 'Collection & Geographic Information' },
      collection_poi: { label: 'Collection POI', field: 'collection_poi', hidden: true, group: 'Collection & Geographic Information' },
      collection_latitude: { label: 'Collection Latitude', field: 'collection_latitude', hidden: true, group: 'Collection & Geographic Information' },
      collection_longitude: { label: 'Collection Longitude', field: 'collection_longitude', hidden: true, group: 'Collection & Geographic Information' },
      geographic_group: { label: 'Geographic Group', field: 'geographic_group', hidden: true, group: 'Collection & Geographic Information' },

      // Pathogen & Laboratory Information
      pathogen_test_type: { label: 'Pathogen Test Type', field: 'pathogen_test_type', hidden: false, group: 'Pathogen & Laboratory Information' },
      pathogen_test_result: { label: 'Pathogen Test Result', field: 'pathogen_test_result', hidden: false, group: 'Pathogen & Laboratory Information' },
      pathogen_test_interpretation: { label: 'Pathogen Test Interpretation', field: 'pathogen_test_interpretation', hidden: true, group: 'Pathogen & Laboratory Information' },
      species: { label: 'Species', field: 'species', hidden: true, group: 'Pathogen & Laboratory Information' },
      pathogen_type: { label: 'Pathogen Type', field: 'pathogen_type', hidden: false, group: 'Pathogen & Laboratory Information' },
      subtype: { label: 'Subtype', field: 'subtype', hidden: false, group: 'Pathogen & Laboratory Information' },
      strain: { label: 'Strain', field: 'strain', hidden: false, group: 'Pathogen & Laboratory Information' },

      // Host Information
      host_identifier: { label: 'Host Identifier', field: 'host_identifier', hidden: false, group: 'Host Information' },
      host_id_type: { label: 'Host ID Type', field: 'host_id_type', hidden: true, group: 'Host Information' },
      host_species: { label: 'Host Species', field: 'host_species', hidden: false, group: 'Host Information' },
      host_common_name: { label: 'Host Common Name', field: 'host_common_name', hidden: false, group: 'Host Information' },
      host_group: { label: 'Host Group', field: 'host_group', hidden: true, group: 'Host Information' },
      host_sex: { label: 'Host Sex', field: 'host_sex', hidden: true, group: 'Host Information' },
      host_age: { label: 'Host Age', field: 'host_age', hidden: false, group: 'Host Information' },
      host_height: { label: 'Host Height', field: 'host_height', hidden: true, group: 'Host Information' },
      host_weight: { label: 'Host Weight', field: 'host_weight', hidden: true, group: 'Host Information' },
      host_habitat: { label: 'Host Habitat', field: 'host_habitat', hidden: true, group: 'Host Information' },
      host_natural_state: { label: 'Host Natural State', field: 'host_natural_state', hidden: true, group: 'Host Information' },
      host_capture_status: { label: 'Host Capture Status', field: 'host_capture_status', hidden: true, group: 'Host Information' },
      host_health: { label: 'Host Health', field: 'host_health', hidden: false, group: 'Host Information' },

      // Exposure, Environment & Epidemiology
      exposure: { label: 'Exposure', field: 'exposure', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      duration_of_exposure: { label: 'Duration of Exposure', field: 'duration_of_exposure', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      exposure_type: { label: 'Exposure Type', field: 'exposure_type', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      use_of_personal_protective_equipment: { label: 'Use of Personal Protective Equipment', field: 'use_of_personal_protective_equipment', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      primary_living_situation: { label: 'Primary Living Situation', field: 'primary_living_situation', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      nursing_home_residence: { label: 'Nursing Home Residence', field: 'nursing_home_residence', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      daycare_attendance: { label: 'Daycare Attendance', field: 'daycare_attendance', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      travel_history: { label: 'Travel History', field: 'travel_history', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      profession: { label: 'Profession', field: 'profession', hidden: true, group: 'Exposure, Environment & Epidemiology' },
      education: { label: 'Education', field: 'education', hidden: true, group: 'Exposure, Environment & Epidemiology' },

      // Pregnancy & Reproductive Information
      pregnancy: { label: 'Pregnancy', field: 'pregnancy', hidden: true, group: 'Pregnancy & Reproductive Information' },
      trimester_of_pregnancy: { label: 'Trimester of Pregnancy', field: 'trimester_of_pregnancy', hidden: true, group: 'Pregnancy & Reproductive Information' },
      breastfeeding: { label: 'Breastfeeding', field: 'breastfeeding', hidden: true, group: 'Pregnancy & Reproductive Information' },

      // Clinical Course & Disease Severity
      hospitalized: { label: 'Hospitalized', field: 'hospitalized', hidden: true, group: 'Clinical Course & Disease Severity' },
      hospitalization_duration: { label: 'Hospitalization Duration', field: 'hospitalization_duration', hidden: true, group: 'Clinical Course & Disease Severity' },
      intensive_care_unit: { label: 'Intensive Care Unit', field: 'intensive_care_unit', hidden: true, group: 'Clinical Course & Disease Severity' },
      chest_imaging_interpretation: { label: 'Chest Imaging Interpretation', field: 'chest_imaging_interpretation', hidden: true, group: 'Clinical Course & Disease Severity' },
      ventilation: { label: 'Ventilation', field: 'ventilation', hidden: true, group: 'Clinical Course & Disease Severity' },
      oxygen_saturation: { label: 'Oxygen Saturation', field: 'oxygen_saturation', hidden: true, group: 'Clinical Course & Disease Severity' },
      ecmo: { label: 'Ecmo', field: 'ecmo', hidden: true, group: 'Clinical Course & Disease Severity' },
      dialysis: { label: 'Dialysis', field: 'dialysis', hidden: true, group: 'Clinical Course & Disease Severity' },
      disease_status: { label: 'Disease Status', field: 'disease_status', hidden: true, group: 'Clinical Course & Disease Severity' },
      days_elapsed_to_disease_status: { label: 'Days Elapsed to Disease Status', field: 'days_elapsed_to_disease_status', hidden: true, group: 'Clinical Course & Disease Severity' },
      disease_severity: { label: 'Disease Severity', field: 'disease_severity', hidden: true, group: 'Clinical Course & Disease Severity' },

      // Medical History & Risk Factors
      alcohol_or_other_drug_dependence: { label: 'Alcohol Or Other Drug Dependence', field: 'alcohol_or_other_drug_dependence', hidden: true, group: 'Medical History & Risk Factors' },
      tobacco_use: { label: 'Tobacco Use', field: 'tobacco_use', hidden: true, group: 'Medical History & Risk Factors' },
      packs_per_day_for_how_many_years: { label: 'Packs Per Day For How Many Years', field: 'packs_per_day_for_how_many_years', hidden: true, group: 'Medical History & Risk Factors' },
      chronic_conditions: { label: 'Chronic Conditions', field: 'chronic_conditions', hidden: true, group: 'Medical History & Risk Factors' },
      maintenance_medications: { label: 'Maintenance Medication', field: 'maintenance_medication', hidden: true, group: 'Medical History & Risk Factors' },
      types_of_allergies: { label: 'Types of Allergies', field: 'types_of_allergies', hidden: true, group: 'Medical History & Risk Factors' },
      influenza_like_illness_over_the_past_year: { label: 'Influenze Like Illiness Over The Past Year', field: 'influenza_like_illness_over_the_past_year', hidden: true, group: 'Medical History & Risk Factors' },
      infections_within_five_years: { label: 'Infections Within Five Years', field: 'infections_within_five_years', hidden: true, group: 'Medical History & Risk Factors' },
      human_leukocyte_antigens: { label: 'Human Leukocyte Antigens', field: 'human_leukocyte_antigens', hidden: true, group: 'Medical History & Risk Factors' },

      // Symptoms & Diagnosis
      symptoms: { label: 'Symptoms', field: 'symptoms', hidden: true, group: 'Symptoms & Diagnosis' },
      onset_hours: { label: 'Onset Hours', field: 'onset_hours', hidden: true, group: 'Symptoms & Diagnosis' },
      sudden_onset: { label: 'Sudden Onset', field: 'sudden_onset', hidden: true, group: 'Symptoms & Diagnosis' },
      diagnosis: { label: 'Diagnosis', field: 'diagnosis', hidden: true, group: 'Symptoms & Diagnosis' },

      // Treatment & Medication
      pre_visit_medications: { label: 'Pre Visit Medication', field: 'pre_visit_medication', hidden: true, group: 'Treatment & Medication' },
      post_visit_medications: { label: 'Post Visit Medication', field: 'post_visit_medication', hidden: true, group: 'Treatment & Medication' },
      treatment_type: { label: 'Treatment Type', field: 'treatment_type', hidden: true, group: 'Treatment & Medication' },
      treatment: { label: 'Treatment', field: 'treatment', hidden: true, group: 'Treatment & Medication' },
      initiation_of_treatment: { label: 'Initiation of Treatment', field: 'initiation_of_treatment', hidden: true, group: 'Treatment & Medication' },
      duration_of_treatment: { label: 'Duration of Treatment', field: 'duration_of_treatment', hidden: true, group: 'Treatment & Medication' },
      treatment_dosage: { label: 'Treatment Dosage', field: 'treatment_dosage', hidden: true, group: 'Treatment & Medication' },

      // Vaccination
      vaccination_type: { label: 'Vaccination Type', field: 'vaccination_type', hidden: true, group: 'Vaccination' },
      days_elapsed_to_vaccination: { label: 'Days Elapsed To Vaccination', field: 'days_elapsed_to_vaccination', hidden: true, group: 'Vaccination' },
      source_of_vaccine_information: { label: 'Source of Vaccine Information', field: 'source_of_vaccine_information', hidden: true, group: 'Vaccination' },
      vaccine_lot_number: { label: 'Vaccine Lot Number', field: 'vaccine_lot_number', hidden: true, group: 'Vaccination' },
      vaccine_manufacturer: { label: 'Vaccine Manufacturer', field: 'vaccine_manufacturer', hidden: true, group: 'Vaccination' },
      vaccine_dosage: { label: 'Vaccine Dosage', field: 'vaccine_dosage', hidden: true, group: 'Vaccination' },
      other_vaccinations: { label: 'Other Vaccinations', field: 'other_vaccinations', hidden: true, group: 'Vaccination' },

    },
    startup: function () {
      var _self = this;
      this.on('.dgrid-content .dgrid-row:dblclick', function (evt) {
        var row = _self.row(evt);

        on.emit(_self.domNode, 'ItemDblClick', {
          item_path: row.data.path,
          item: row.data,
          bubbles: true,
          cancelable: true
        });
      });

      this.on('dgrid-select', function (evt) {
        // console.log('dgrid-select: ', evt);
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'select', newEvt);
      });
      this.on('dgrid-deselect', function (evt) {
        // console.log('dgrid-select');
        var newEvt = {
          rows: evt.rows,
          selected: evt.grid.selection,
          grid: _self,
          bubbles: true,
          cancelable: true
        };
        on.emit(_self.domNode, 'deselect', newEvt);
      });
      this.inherited(arguments);
      this.refresh();
    }
  });
});
