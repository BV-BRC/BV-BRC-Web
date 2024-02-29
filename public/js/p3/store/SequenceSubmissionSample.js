define([
    'dojo/_base/declare'
], function (
    declare
) {
    let SubmissionSample = declare(null, {
        monthArray: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        sequenceTypes: ['Wild-type virus', 'Reverse genetic (rg) Virus', 'Reassortment virus (not rg derived)',
            'Animal adapted', 'RG animal adapted'],

        // Initialize submission sample with the data provided
        constructor: function ({store, data}) {
            this.sampleIdentifier = store.getIdentity(data);
            this.sampleDescription = store.getValue(data, 'Sample Description');
            this.organism = store.getValue(data, 'Organism');
            this.sequenceType = store.getValue(data, 'Sequence Type');
            this.authors = store.getValue(data, 'Authors');
            this.publicationTitle = store.getValue(data, 'Publication Title');
            this.publicationPMID = store.getValue(data, 'Publication PMID');
            this.strainName = store.getValue(data, 'Strain Name');
            this.strainHost = store.getValue(data, 'Host');
            this.strainSubtype = store.getValue(data, 'Subtype');
            this.collectionDate = store.getValue(data, 'Collection Date');
            this.collectionCountry = store.getValue(data, 'Collection Country');
            this.collectionRegion = store.getValue(data, 'Collection Region');
            this.collectionCity = store.getValue(data, 'Collection City');
            this.labHost = store.getValue(data, 'Lab Host');
            this.parentStrains = store.getValue(data, 'Parent Strains');
            this.passageHistory = store.getValue(data, 'Passage History');
            this.antigenicCharacterization = store.getValue(data, 'Antigenic Characterization');
            this.treatment = store.getValue(data, 'Treatment');
            this.transmissionMethod = store.getValue(data, 'Transmission Method');
            this.severity = store.getValue(data, 'Severity');
            this.phenotype = store.getValue(data, 'Phenotype');
            this.latitudeLongitude = store.getValue(data, 'Latitude/Longitude');
            this.isolationSource = store.getValue(data, 'Isolation Source');
            this.isolationSourceGender = store.getValue(data, 'Isolation Source Gender');
            this.isolationSourceAge = store.getValue(data, 'Isolation Source Age');
            this.ageForBird = store.getValue(data, 'Age for Bird');
            this.anatomicalRegion = store.getValue(data, 'Anatomical Region');
            this.validations = [];
        },

        validate: function () {
            // Sample description cannot be empty and more than 4000 chars
            if (!this.sampleDescription) {
                this.validations.push({type: 'error', message: 'Sample Description is required.'});
            } else if (this.sampleDescription.length > 4000) {
                this.validations.push({
                    type: 'error', message: 'Sample Description can not be greater than 4000 characters.'
                });
            }

            // Validate organism
            if (!this.organism) {
                this.validations.push({type: 'error', message: 'Organism is required.'});
            } else if (this.organism.length > 100) {
                this.validations.push({
                    type: 'error', message: 'Organism can not be greater than 100 characters.'
                });
            }

            // Validate sequence type
            if (!this.sequenceType) {
                this.validations.push({type: 'error', message: 'Sequence Type is required.'});
            } else if (!this.sequenceTypes.includes(this.sequenceType)) {
                this.validations.push({
                    type: 'error', message: 'Sequence Type is not valid. Options: ' + this.sequenceTypes.join(', ')
                });
            }

            // Validate publication title
            if (!this.publicationTitle) {
                this.validations.push({
                    type: 'error', message: 'Publication Title is required. It might be missing from the metadata file. ' +
                        'Please use \'Unpublished\' if unpublished.'
                });
            } else if (this.publicationTitle === 'NA' || this.publicationTitle === '"NA"' || this.publicationTitle === '""NA""') {
                this.validations.push({
                    type: 'error', message: 'Publication Title should be \'Unpublished\' instead of \'NA\' if unpublished.'
                });
            }

            // Validate publication PMID
            if (this.publicationPMID && this.publicationPMID.length > 50) {
                this.validations.push({
                    type: 'error', message: 'Publication PMID cannot be more than 50 characters.'
                });
            }

            // Validate Strain Host
            if (!this.strainHost) {
                this.validations.push({type: 'error', message: 'Strain Host is required.'});
            }

            // Validate Collection Country
            if (!this.collectionCountry) {
                this.validations.push({type: 'error', message: 'Collection Country is required.'});
            } else {
                if (!SubmissionSample.submissionCountryList.includes(this.collectionCountry)) {
                    // TODO: Provide country list to the user? line 365-366 in ird code
                    this.validations.push({type: 'error', message: 'Collection Country is not in the country list.'});
                }
            }

            // Validate Collection Date
            // Store collection year to validate strain name
            let collectionYear;
            if (!this.collectionDate) {
                this.validations.push({type: 'error', message: 'Collection Date is required.'});
            } else {
                // Collection date can be unknown (U)
                if (this.collectionDate != 'U') {
                    let isDateValid = true;
                    const dateArr = this.collectionDate.split('-');

                    if (dateArr.length == 1) {
                        // YYYY or YY
                        if (!this.isValidYear(dateArr[0])) {
                            isDateValid = false;
                        } else {
                            collectionYear = parseInt(dateArr[0].padStart(4, 20), 10);
                        }
                    } else if (dateArr.length == 2) {
                        // Mon-YYYY or Mon-YY
                        if (!this.monthArray.includes(dateArr[0]) || !this.isValidYear(dateArr[1])) {
                            isDateValid = false;
                        } else {
                            collectionYear = parseInt(dateArr[1].padStart(4, 20), 10);
                        }
                    } else if (dateArr.length == 3) {
                        // DD-Mon-YYYY or DD-Mon-YY
                        if (!/^\d+$/.test(dateArr[0]) || !this.monthArray.includes(dateArr[1]) || !this.isValidYear(dateArr[2])) {
                            isDateValid = false;
                        } else {
                            collectionYear = parseInt(dateArr[2].padStart(4, 20), 10);
                            const month = this.monthArray.indexOf(dateArr[1]) + 1;
                            const day = parseInt(dateArr[0], 10);

                            if (month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12) {
                                if (day > 31) {
                                    this.validations.push({
                                        type: 'error', message: `Invalid date. Day in Collection Date should be a number between 1 to 31 for ${month}-${collectionYear}.`
                                    });
                                }
                            } else if (month === 2) {
                                if (collectionYear > 0) {
                                    if ((collectionYear % 4 === 0 && (collectionYear % 100 !== 0 || collectionYear % 400 === 0))) {
                                        if (day > 29) {
                                            this.validations.push({
                                                type: 'error', message: `Invalid date. Day in Collection Date should be a number between 1 to 29 for ${month}-${collectionYear}.`
                                            });
                                        }
                                    } else {
                                        if (day > 28) {
                                            this.validations.push({
                                                type: 'error',
                                                message: `Invalid date. Day in Collection Date should be a number between 1 to 28 for ${month}-${collectionYear}.`
                                            });
                                        }
                                    }
                                } else if (day > 28) {
                                    this.validations.push({
                                        type: 'error',
                                        message: `Invalid date. Day in Collection Date should be a number between 1 to 28 for ${month}-${collectionYear}.`
                                    });
                                }
                            } else {
                                if (day > 30) {
                                    this.validations.push({
                                        type: 'error',
                                        message: `Invalid date. Day in Collection Date should be a number between 1 to 30 for ${month}-${collectionYear}.`
                                    });
                                }
                            }
                        }
                    } else {
                        isDateValid = false;
                    }

                    if (!isDateValid) {
                        this.validations.push({type: 'error', message: 'Collection Date is not valid. Valid options: ' +
                                '"DD-Mon-YYYY", "DD-Mon-YY", "Mon-YYYY", "Mon-YY", "YYYY", "YY", "U"'});
                    }
                }
            }

            // Validate Strain Name
            if (!this.strainName) {
                this.validations.push({type: 'error', message: 'Strain Name is required.'});
            } else if (this.sequenceType === 'Wild-type virus') {
                // TODO: We are validating strain name for wild-types only. Implement others if required
                this.validateStrainName(collectionYear);
            }

            // Validate Lab Host
            if (this.labHost) {
                const re = new RegExp('^[a-zA-Z- ]+\\d*(,[a-zA-Z- ]+\\d*)*');
                const match = re.exec(this.labHost.trim());
                if (!match || match.length === 0) {
                    this.validations.push({
                        type: 'error',
                        message: 'Lab Host\'s format should be the host followed by number of passages separated by ' +
                            'a comma if there are multiple hosts.'
                    });
                }
            }

            // Validate Passage History
            if (this.passageHistory && this.passageHistory.length > 500) {
                this.validations.push({
                    type: 'error',
                    message: 'Passage History can not be greater than 500 characters.'
                });
            }

            // Validate Isolation Source Gender
            if (this.isolationSourceGender && 'Male' !== this.isolationSourceGender && 'Female' !== this.isolationSourceGender) {
                this.validations.push({
                    type: 'error',
                    message: 'Isolation Source Gender should be either \'Male\' or \'Female\'.'
                });
            }

            // Validate Isolation Source Age and AgeUnit (representing if the age is for bird or not)
            if (this.isolationSourceAge && this.ageForBird) {
                this.validations.push({
                    type: 'error',
                    message: 'Both \'Isolation Source Age\' and \'Age for Bird\' are entered.  Please choose only 1 ' +
                        'field to populate the data.'
                });
            } else {
                if (this.isolationSourceAge) {
                    const re = new RegExp('\\d* Y|\\d* M|\\d* W');
                    const match = re.exec(this.isolationSourceAge.trim());
                    if (!match || match.length === 0) {
                        this.validations.push({
                            type: 'error',
                            message: 'Isolation Source Age should be a number follow by a space then Y or M or W for ' +
                                'year or month or week, for example, 5 Y, 2 M or 3 W.'
                        });
                    }
                }
            }
        },

        validateStrainName: function (collectionYear) {
            if (this.strainName && this.strainHost) {
                const parts = this.strainName.split('/');
                const slashCount = parts.length - 1;

                // Host and Location validation
                if ('HUMAN' === this.strainHost.toUpperCase()) {
                    // Validate the host name
                    if (!this.isStrainHostValid(this.strainHost)) {
                        this.validations.push({
                            type: 'error',
                            message: 'Strain Name: Strain Host species must be spelled out in all lower case letters except when ' +
                                'using a proper noun such as Canadian or Cambodian the first letter can be upper case. ' +
                                'A space is allowed (e.g., American wigeon).'
                        });
                    }

                    // Number of slash should be <= 3
                    if (slashCount > 3) {
                        this.validations.push({
                            type: 'error',
                            message: 'Strain Name: When strain host is human, strain name should contain 3 slashes (\'/\'). ' +
                                'A valid strain name when the host is human is {A|B|C}/&lt;Location&gt;/&lt;isolate&gt;/{yyyy}(SUBTYPE)'
                        });
                    } else {
                        if (parts.length >= 2) {
                            // Check the value after first slash not to be human
                            if ('HUMAN' === parts[1].toUpperCase()) {
                                this.validations.push({
                                    type: 'error',
                                    message: 'Strain name should not contain "human"'
                                });

                                // Perform the location check for the value after the first slash
                            } else if (!this.isStrainNameLocationValid(parts[1])) {
                                this.validations.push({
                                    type: 'error',
                                    message: 'Strain Name: Location (' + parts[1] + ') in the strain name must be spelled out ' +
                                        'in all lower case letters except for the first letter in each word of a location name. A ' +
                                        'space may be used, but no abbreviation is allowed as required by GenBank ' +
                                        '(Hong Kong is allowed, HK is not).'
                                });
                            }
                        } else {
                            this.validations.push({
                                type: 'error',
                                message: 'Strain Name is invalid. A valid strain name is in {A|B|C}/&lt;Host if not human&gt;' +
                                    '/&lt;Location&gt;/&lt;isolate&gt;/{yyyy}(SUBTYPE)'
                            });
                        }
                    }
                } else {
                    // Check number of slash should be <=4
                    if (slashCount > 4) {
                        this.validations.push({
                            type: 'error',
                            message: 'Strain Name: When Host is not human, strain name should contain 4 slashes ("/"). A valid strain ' +
                                'name is in {A|B|C}/&lt;Host if not human&gt;/&lt;Location&gt;/&lt;isolate&gt;/{yyyy}(SUBTYPE)'
                        });
                    }

                    let isHostPassed = true;
                    if (parts.length > 2) {
                        // After the first slash should match name should match with
                        if (this.strainHost !== parts[1]) {
                            this.validations.push({
                                type: 'error',
                                message: 'Strain Name: Strain Host (' + this.strainHost + ') does NOT match with the host in ' +
                                    'strain name. Host should appear after the first slash in the strain name. However, ' +
                                    'when the host is "human", no host should appear in strain name.'
                            });
                        } else {
                            // Perform host validation against value after the first slash
                            if (!this.isStrainHostValid(parts[1])) {
                                this.validations.push({
                                    type: 'error',
                                    message: 'Strain Name: Host (' + parts[1] + ') in the strain name must be spelled out in ' +
                                        'all lower case letters except when using a proper noun such as Canadian or Cambodian ' +
                                        'the first letter can be upper case. A space is allowed (e.g., American wigeon).'
                                });
                                isHostPassed = false;
                            }

                            // Validate the host name
                            if (!this.isStrainHostValid(this.strainHost)) {
                                this.validations.push({
                                    type: 'error',
                                    message: 'Strain Name: Host species in the strain name must be spelled out in all lower ' +
                                        'case letters except when using a proper noun such as Canadian or Cambodian the first ' +
                                        'letter can be upper case. A space is allowed (e.g., American wigeon).'
                                });
                            }
                        }
                    }

                    if (parts.length > 3 && isHostPassed) {
                        // Perform location validation check on the value after the second slash
                        if (!this.isStrainNameLocationValid(parts[2])) {
                            this.validations.push({
                                type: 'error',
                                message: 'Strain name: Location (' + parts[2] + ') in the strain name must be spelled ' +
                                    'out in all lower case letters except for the first letter in each word of a location ' +
                                    'name. A space may be used, but no abbreviation is allowed as required by GenBank ' +
                                    '(Hong Kong is allowed, HK is not).'
                            });
                        }
                    }
                }

                if (parts != null && parts.length > 2) {
                    // Try to identify the flutype
                    // Strain Name's first character should be A, B, or C
                    if ('A' !== parts[0] && 'B' !== parts[0] && 'C' !== parts[0]) {
                        this.validations.push({
                            type: 'error',
                            message: 'Strain Name: First part of Strain Name is not A, B or C to represent the Influenza Virus Type.'
                        });
                    }

                    // Try to determine the subtype & year candidate (Strain name without the subtype portion)
                    const lastPart = parts[parts.length - 1];
                    const paramStart = lastPart.indexOf('(');
                    const paramEnd = lastPart.indexOf(')');
                    let subtypeCandidate, yearCandidate;
                    if (paramStart >= 0) {
                        if (paramEnd < 0) {
                            // There is no end parenthesis, so from start to end
                            subtypeCandidate = lastPart.substring(paramStart + 1);
                        } else {
                            subtypeCandidate = lastPart.substring(paramStart + 1, paramEnd);
                        }
                        subtypeCandidate = subtypeCandidate.replace(/\s/g, '');

                        // If we found the parenthesis, then get from the beginning to paramStart
                        yearCandidate = lastPart.substring(0, paramStart).trim();
                    } else {
                        // We do NOT have the parenthesis, so the first 4 characters should be the year
                        if (lastPart.length >= 4) {
                            yearCandidate = lastPart.substring(0, 4);
                        } else {
                            yearCandidate = lastPart;
                        }
                    }

                    // Subtype validation
                    const userSubtype = this.strainSubtype ? this.strainSubtype.replace(/\s/g, '') : '';
                    if (!userSubtype) {
                        this.validations.push({
                            type: 'error',
                            message: 'Strain Name: Strain Subtype is required.'
                        });
                    } else if (typeof subtypeCandidate !== "undefined") {
                        const re = new RegExp('[Hh](1[0-5]|[1-9])[Nn][1-9]|^[Hh](1[0-5]|[1-9])$|^[Nn][1-9]$');
                        const match = re.exec(subtypeCandidate);
                        if (match.length > 0) {
                            const strainNameSubType = match[0];
                            if (strainNameSubType !== userSubtype) {
                                // StrainName and user input subtypes do NOT match
                                this.validations.push({
                                    type: 'error',
                                    message: 'Strain Name: Subtype(' + strainNameSubType + ') in the strain name should match with ' +
                                        'the input strain name (' + userSubtype + ')'
                                });
                            } else {
                                // validate to see if the final subtype has both H and N type, if not, then set warning
                                const re = new RegExp('[Hh](1[0-5]|[1-9])[Nn][1-9]');
                                const match = re.exec(userSubtype);
                                /*if (!match || match.length === 0) {
                                    this.validations.push({
                                        type: 'warning',
                                        message: 'Strain Name: Strain Subtype should contain both H and N type, you may still submit ' +
                                            'this sample, but IRD curator may contact you for further information before submit to GenBank.'
                                    });
                                }*/
                            }
                        }
                    } else {
                        // validate to see if the final subtype has both H and N type, if not, then set warning
                        const re = new RegExp('[Hh](1[0-5]|[1-9])[Nn][1-9]');
                        const match = re.exec(userSubtype);
                        /*if (!match || match.length === 0) {
                            this.validations.push({
                                type: 'warning',
                                message: 'Strain Name: Strain Subtype should contain both H and N type, you may still submit ' +
                                    'this sample, but IRD curator may contact you for further information before submit to GenBank.'
                            });
                        }*/
                    }

                    // if yearCandidate is not undefined, validate it
                    if (typeof subtypeCandidate !== 'undefined') {
                        // Try to get the year from the strain name
                        const re = new RegExp('^\\d{4}');
                        const match = re.exec(yearCandidate);
                        if (match && match.length > 0) {
                            yearCandidate = match[0];
                        } else {
                            yearCandidate = null;
                            this.validations.push({
                                type: 'error',
                                message: 'Strain Name: Year must be 4 digits in the strain name.'
                            });
                        }
                    }

                    // If user has entered the year, then validate against the year in the strain name
                    if (yearCandidate && collectionYear && typeof subtypeCandidate !== 'undefined') {
                        // Now validate the user input year against parsed year
                        if (parseInt(yearCandidate.padStart(4, '20'), 10) !== collectionYear) {
                            this.validations.push({
                                type: 'error',
                                message: 'Collection year (' + collectionYear + ') does NOT match with the parsed year ' +
                                    '(' + yearCandidate + ') from the strain name.'
                            });
                        }
                    }
                } else {
                    this.validations.push({
                        type: 'error',
                        message: 'Strain Name is invalid. A valid strain name is in {A|B|C}/&lt;Host if not human&gt;/' +
                            '&lt;Location&gt;/&lt;isolate&gt;/{yyyy}(SUBTYPE)'
                    });
                }

                // Check if strain name contain 'passage'
                if (this.strainName.toLowerCase().includes('passage')) {
                    this.validations.push({
                        type: 'error',
                        message: 'Do not include passage information in strain name. Passage details should be entered ' +
                            'in the "Passage History" field.'
                    });
                }
            }
        },

        isValidYear: function (year) {
            return /^\d+$/.test(year) && (year.length == 4 || year.length == 2);
        },

        isStrainHostValid: function (host) {
            const strainHostName = host.includes(' ') ? host.trim().substr(1) : host;

            return strainHostName.toLowerCase() === strainHostName;
        },

        isStrainNameLocationValid: function (location) {
            const re = new RegExp('[a-zA-Z]+');

            const partialLocations = location.split(' ');
            for (let location of partialLocations) {
                const val = location.trim();
                const match = re.exec(val);

                if (val && val.length > 1 && match.length > 0 && (val === val.toUpperCase() || !this.checkCapitalized(val))) {
                    return false;
                }
            }

            return true;
        },

        checkCapitalized: function (value) {
            if (!value) {
                return false;
            }

            let capNumber = 0;
            for (let c of value) {
                if (c === c.toUpperCase()) {
                    capNumber = capNumber + 1;
                }
            }

            if (capNumber > 0) {
                const firstChar = value[0];
                if (firstChar !== firstChar.toUpperCase()) {
                    return false;
                } else if (capNumber > 1) {
                    return false;
                }
            } else {
                return false;
            }

            return true;
        }
    });

    SubmissionSample.submissionCountryList = ['Afghanistan', 'Albania', 'Algeria', 'American Samoa', 'Andorra', 'Angola', 'Anguilla',
        'Antarctica', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Arctic Ocean', 'Aruba', 'Ashmore and Cartier Islands',
        'Atlantic Ocean', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Baker Island', 'Bangladesh',
        'Barbados', 'Bassas da India', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bermuda', 'Bhutan', 'Bolivia',
        'Bosnia and Herzegovina', 'Botswana', 'Bouvet Island', 'Brazil', 'British Virgin Islands', 'Brunei', 'Bulgaria',
        'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde', 'Cayman Islands', 'Central African Republic',
        'Chad', 'Chile', 'China', 'Christmas Island', 'Clipperton Island', 'Cocos Islands', 'Colombia', 'Comoros',
        'Cook Islands', 'Coral Sea Islands', 'Costa Rica', 'Cote d\'Ivoire', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic',
        'Denmark', 'Democratic Republic of the Congo', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor',
        'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Europa Island',
        'Falkland Islands (Islas Malvinas)', 'Faroe Islands', 'Fiji', 'Finland', 'France', 'French Guiana', 'French Polynesia',
        'French Southern and Antarctic Lands', 'Gabon', 'Gambia', 'Gaza Strip', 'Georgia', 'Germany', 'Ghana', 'Gibraltar',
        'Glorioso Islands', 'Greece', 'Greenland', 'Grenada', 'Guadeloupe', 'Guam', 'Guatemala', 'Guernsey', 'Guinea',
        'Guinea-Bissau', 'Guyana', 'Haiti', 'Heard Island and McDonald Islands', 'Honduras', 'Hong Kong', 'Howland Island',
        'Hungary', 'Iceland', 'India', 'Indian Ocean', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Isle of Man', 'Israel',
        'Italy', 'Jamaica', 'Jan Mayen', 'Japan', 'Jarvis Island', 'Jersey', 'Johnston Atoll', 'Jordan', 'Juan de Nova Island',
        'Kazakhstan', 'Kenya', 'Kingman Reef', 'Kiribati', 'Kerguelen Archipelago', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia',
        'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau', 'Macedonia', 'Madagascar',
        'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Martinique', 'Mauritania', 'Mauritius',
        'Mayotte', 'Mexico', 'Micronesia', 'Midway Islands', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Montserrat',
        'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Navassa Island', 'Nepal', 'Netherlands', 'Netherlands Antilles',
        'New Caledonia', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'Niue', 'Norfolk Island', 'North Korea',
        'Northern Mariana Islands', 'Norway', 'Oman', 'Pacific Ocean', 'Pakistan', 'Palau', 'Palmyra Atoll', 'Panama',
        'Papua New Guinea', 'Paracel Islands', 'Paraguay', 'Peru', 'Philippines', 'Pitcairn Islands', 'Poland', 'Portugal',
        'Puerto Rico', 'Qatar', 'Reunion', 'Republic of the Congo', 'Romania', 'Russia', 'Rwanda', 'Saint Helena',
        'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines', 'Samoa',
        'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
        'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Georgia and the South Sandwich Islands',
        'South Korea', 'Spain', 'Spratly Islands', 'Sri Lanka', 'Sudan', 'Suriname', 'Svalbard', 'Swaziland', 'Sweden',
        'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tokelau', 'Tonga', 'Trinidad and Tobago',
        'Tromelin Island', 'Tunisia', 'Turkey', 'Turkmenistan', 'Turks and Caicos Islands', 'Tuvalu', 'Uganda', 'Ukraine',
        'United Arab Emirates', 'United Kingdom', 'USA', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Venezuela', 'Viet Nam',
        'Virgin Islands', 'Wake Island', 'Wallis and Futuna', 'West Bank', 'Western Sahara', 'Yemen', 'Yugoslavia',
        'Zambia', 'Zimbabwe'];

    return SubmissionSample;
});