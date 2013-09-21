define(
  ['jquery'],
  function($) {
    
    /**
     * Represents a single row within an TableForm.
     * @param {jQuery} jQueryRow The jQuery-wrapped DOM element that 
     *     represents this row
     * @constructor
     */
    function ArrayRow(jQueryRow) {
        var _this = this; // So we can refer to this object in closures
        
        this.$row = jQueryRow;
        
        this.$fields = [];
        var fields = this.$row.find(':input');
        fields.each(function(i) {
            _this.$fields.push($(this));
        });
        
        this.isVisible = true;
        this.$row.show();
    }
    
    /**
     * Sets focus to the first input element in the ArrayRow
     */
    ArrayRow.prototype.setFocusToFirstInputElement = function() {
        this.$fields[0].focus();
    }
    
    /**
     * Checks if this row has any data in it
     * @returns {boolean} Returns true if the given row has no data in it, 
     *     else returns false.
     */
    ArrayRow.prototype.fieldsAreEmpty = function() {
        for (var i = 0; i < this.$fields.length; i++) {
            // If this is a checkbox or radio button, see if it's checked, as
            // checked indicates it has a filled value
            if (this.$fields[i].is(':checkbox') || this.$fields[i].is(':radio')) {
                if (this.$fields[i].is(':checked')) {
                  return false;
                }
            } else {
                if (this.$fields[i].val() != "") {
                    return false;
                }
            }
        }
        return true;
    };
    
    /**
     * Swaps data with other ArrayRow.
     * @param {ArrayRow} otherRow The ArrayRow instance with which we 
     *     will swap data with; NOTE: Obviously this will only work if the 
     *     other ArrayRow has the same fields as this; i.e., it should be of
     *     the same TableForm.
     */
    ArrayRow.prototype.swapDataWithOtherRow = function(otherRow) {
        var alreadyProcessedRadioNames = [];
        
        for (var i = 0; i < this.$fields.length; i++) {
            var $otherField = otherRow.$fields[i];
            var $thisField = this.$fields[i];
            
            if ($thisField.is(':radio')) {
                // Fields are radios, which makes things tricky.
                // We have to find all radio inputs with the same name and 
                // determine which one is checked for each row.
                var thisName, 
                    otherName, 
                    thisSelectedValue, 
                    otherSelectedValue,
                    otherFieldsWithSameName,
                    thisFieldsWithSameName,
                    nameAlreadyDealtWith;
                
                // First, see if we've already processed this name -- if 
                // we have, then we've already dealt with this radio set and
                // we can keep looping.
                thisName = $thisField.attr("name");
                nameAlreadyDealtWith = false;
                for (var j = 0; j < alreadyProcessedRadioNames.length; j++) {
                    if (thisName === alreadyProcessedRadioNames[j]) {
                        nameAlreadyDealtWith = true;
                        break;
                    }
                }
                if (nameAlreadyDealtWith) {
                    continue;
                }
                otherName = $otherField.attr("name");
                
                // Returns an array of fields with the same name
                function getFieldsWithSameName(fields, name) {
                    sameNamedFields = [];
                    for (var j = 0; j < fields.length; j++) {
                        if (fields[j].attr("name") === name) {
                            sameNamedFields.push(fields[j]);
                        }
                    }
                    return sameNamedFields;
                }
                
                // Returns the selected value for the given name among the 
                // array of fields
                function getSelectedValue(fields) {
                    for (var j = 0; j < fields.length; j++) {
                        if (fields[j].is(':checked')) {
                            return fields[j].attr('value');
                        }
                    }
                    return false; // No selected value
                }
                
                // Checks the radio button among the given fields that
                // has the given value
                function setField(value, fields) {
                    for (var j = 0; j < fields.length; j++) {
                        if (value === false) {
                            fields[j].prop('checked', false);
                        } else {
                            if (fields[j].attr("value") === value) {
                                fields[j].prop('checked', true);
                                return; // No need to continue looping
                            }
                        }
                    }
                }
                
                otherFieldsWithSameName = getFieldsWithSameName(otherRow.$fields, otherName);
                thisFieldsWithSameName = getFieldsWithSameName(this.$fields, thisName);

                otherSelectedValue = getSelectedValue(otherFieldsWithSameName);
                thisSelectedValue = getSelectedValue(thisFieldsWithSameName);
                
                setField(thisSelectedValue, otherFieldsWithSameName);
                setField(otherSelectedValue, thisFieldsWithSameName);
                
                // We don't want to run this process over and over again
                // for every radio button, so we'll add it to the list of
                // already processed names.
                alreadyProcessedRadioNames.push(thisName);
            } else {
                // Fields are text inputs or textareas
                var otherFieldVal = $otherField.val();
                var thisFieldVal = $thisField.val();
                
                $otherField.val(thisFieldVal);
                $thisField.val(otherFieldVal);
            }
            
            // TODO: Possibly trigger 'change' events events on each field --
            // but this didn't seem to perform well for us
        }
    };
    
    /**
     * Sets the value of all fields in this row to empty strings.
     */
    ArrayRow.prototype.clearData = function() {
        for (var i = 0; i < this.$fields.length; i++) {
            this.$fields[i].val("");
            
            // TODO: Possibly trigger 'change' events events on each field --
            // but this didn't seem to perform well for us
        }
    };
    
    /**
     * Hides this row.
     */
    ArrayRow.prototype.makeInvisible = function() {
        this.isVisible = false;
        this.$row.hide();
    };
    
    /**
     * Shows this row.
     */
    ArrayRow.prototype.makeVisible = function() {
        this.isVisible = true;
        this.$row.show();
        // When a field is made invisible, it should be disabled, as we don't 
        // want the field to transmit on submission. But we probably
        // don't want to remove the disabled attribute from invisible fields.
        for (var i = 0; i < this.$fields.length; i++) {
            if (this.$fields[i].is(':visible')) {
                this.$fields[i].removeAttr('disabled');
            }
        }
    };
    
    
    /**
     * This class turns a table-like form into an interactive experience, 
     * allowing the user to to remove rows of data or add new ones.
     * 
     * TableForms need some specific "data-" attributes and class names in 
     * order to work. Specifically:
     *   - The single "Table", an element with the "is-table-form" class, with an id
     *     that is, preferably, the model that this table represents.
     *   - "Rows", elements within the table. Indicate that an element is a 
     *     row by including the "is-table-form-row" class on that element.
     *   - "Fields", elements within a row that are the fields. The HTML 
     *     name of each field ought to be the field name, followed by an 
     *     underscore, followed by the row number (e.g., "account_number_1").
     *   - IMPORTANT: Fields in rows must be exactly the same.
     *     That is, every row in a single TableForm should have the same number
     *     of fields in the exact same order, and should represent the same 
     *     thing conceptually, like an account number.
     *   - Remove Row Buttons: With each row, a button should be included
     *     that removes that row, and should have the class 
     *     "is-table-form-row-removal-btn".
     *   - Add Row Button: With the table, a single button should be included
     *     for adding a row, and should have the class "is-table-form-row-add-btn".
 *     
     * Note: The elements above can be HTML table elements or divs or anything
     * that can contain other elements, really. This class doesn't care.
     * 
     * @param {string} tableId The HTML ID of the TableForm
     * @constructor
     */
    function TableForm(tableId) {
        var _this = this; // So we can refer to this object in closures
        
        /**
         * The HTML ID of this table.
         * @type {string}
         */
        this.id = tableId;
        
        /**
         * This table as a jquery-wrapped DOM object.
         * @type {array}
         */
        this.$table = $('#' + this.id);
        
        /**
         * An array of ArrayRow objects that make up this table.
         * @type {array<ArrayRow>}
         */
        this.rows = [];
        this.$table.find('.is-table-form-row').each(function(i) {
          _this.rows.push(new ArrayRow($(this)));
        });
        
        /**
         * An array of jquery-wrapped DOM objects of remove row buttons.
         * @type {array}
         */
        this.$removeRowBtns = [];
        this.$table.find('.is-table-form-row-removal-btn').each(function(i) {
            _this.$removeRowBtns.push($(this));
        });
        
        /**
         * A jquery-wrapped DOM object, representing the add row button.
         */
        this.$addRowBtn = this.$table.find('.is-table-form-row-add-btn');
        
        // Attach listener to row removal buttons
        var attachRemoveRowListener = function(rowNumber) {
            var removeRowBtnListener = function(e) {
                e.preventDefault();
                _this.removeRow(rowNumber);
            };
            return removeRowBtnListener;
        };
        for (var i = 0; i < this.$removeRowBtns.length; i++) {
            this.$removeRowBtns[i].on('click', attachRemoveRowListener(i));
        }
        
        // Attach listener to add row button
        var addRowBtnListener = function(e) {
            e.preventDefault();
            _this.appendEmptyRow();
            _this.rows[_this.getLastVisibleRow()].setFocusToFirstInputElement();
        };
        this.$addRowBtn.on('click', addRowBtnListener);
        
        // Iterate through each row backwards and hide each row that is empty
        // except for the first row; escape once we hit a non-empty row
        for (var i = this.rows.length - 1; i > 0; i--) {
            if (this.rows[i].fieldsAreEmpty()) {
                this.rows[i].makeInvisible();
            } else {
                break;
            }
        }
        
        // Hide the append row button if all rows are visible
        if (this.getLastVisibleRow() == this.rows.length - 1) {
            this.hideAppendEmptyRowBtn();
        }
    }
    
    /**
     * Returns the last empty row.
     * @returns {number} Returns the last empty row, or -1 if all rows are 
     *     empty.
     */
    TableForm.prototype.getLastEmptyRow = function() {
        var lastEmptyRow = this.rows.length - 1;
        for (var i = this.rows.length - 1; i >= 0; i--) {
            if (this.rows[i].fieldsAreEmpty()) {
              lastEmptyRow--;
            } else {
              break;
            }
        }
        return lastEmptyRow;
    };
    
    /**
     * Returns the last visible row.
     * @returns {number} Returns the last visible row, or -1 if all rows are 
     *     invisible.
     */
    TableForm.prototype.getLastVisibleRow = function() {
        var lastVisibleRow = this.rows.length - 1;
        for (var i = this.rows.length - 1; i >= 0; i--) {
            if (this.rows[i].isVisible == false) {
              lastVisibleRow--;
            } else {
              break;
            }
        }
        return lastVisibleRow;
    };
    
    /**
     * Appends an empty row to this TableForm.
     */
    TableForm.prototype.appendEmptyRow = function() {
        var firstInvisibleRow = this.getLastVisibleRow() + 1;
        this.rows[firstInvisibleRow].makeVisible();
        
        if (firstInvisibleRow == this.rows.length - 1) {
            this.hideAppendEmptyRowBtn();
        }
    };
    
    /**
     * Pushes data down from the given row, to rows below.
     * @param {number} rowNumber This is the number of the row from which to
     *     push down, effectively creating a gap at this row.
     */
    TableForm.prototype.offsetRowsDown = function(rowNumber) {
        for (var i = this.rows.length - 1; i >= rowNumber; i--) {
            if (i == rowNumber) {
              this.rows[i].clearData();
            } else {
              this.rows[i].swapDataWithOtherRow(this.rows[i - 1]);
            }
        }
    };
    
    /**
     * Pushes data up from the last row up to the given row.
     * @param {number} rowNumber This is the number of the row to push up 
     *     towards. Data in this row will be replaced with the row above it,
     *     that row will have its data replaced with the row above it, and so
     *     on, until the top-most row, which will be replaced with blank 
     *     values.
     */
    TableForm.prototype.offsetRowsUp = function(rowNumber) {
        for (var i = rowNumber; i < this.rows.length; i++) {
            if (i == this.rows.length - 1) {
              this.rows[i].clearData();
            } else {
              this.rows[i].swapDataWithOtherRow(this.rows[i + 1]);
            }
        }
    };
    
    /**
     * Removes the specified row from the TableForm.
     * @param {number} rowNumber This is the number of the row to remove.
     */
    TableForm.prototype.removeRow = function(rowNumber) {
        var lastVisibleRowNum = this.getLastVisibleRow();
        this.offsetRowsUp(rowNumber);
        this.rows[lastVisibleRowNum].makeInvisible();
        this.showAppendEmptyRowBtn();
    };
    
    /**
     * Attempts to inserts a blank row at the specified row number.
     * @param {number} rowNumber This is the row number to insert.
     * @returns {boolean} Returns false if a blank row could not be inserted,
     *     which happens if all rows are already visible. Returns true if
     *     the row was successfully inserted.
     */
    TableForm.prototype.insertBlankRow = function(rowNumber) {
        var firstInvisibleRow = this.getLastVisibleRow() + 1;
        if (firstInvisibleRow == this.rows.length) {
            return false;
        }
        
        this.rows[firstInvisibleRow].makeVisible();
        if (firstInvisibleRow == this.rows.length - 1) {
            this.hideAppendEmptyRowBtn();
        }
        this.offsetRowsDown(rowNumber);
        return true;
    };
    
    /**
     * Hides the remove row button for the specified row.
     * @param {number} rowNumber This is the row number of the remove row 
     *     button to hide.
     */
    TableForm.prototype.hideRemoveRowBtn = function(rowNumber) {
        this.$removeRowBtns[rowNumber].hide();
    };
    
    /**
     * Shows the remove row button for the specified row.
     * @param {number} rowNumber This is the row number of the remove row 
     *     button to show.
     */
    TableForm.prototype.showRemoveRowBtn = function(rowNumber) {
        this.$removeRowBtns[rowNumber].show();
    };
    
    /**
     * Hides the append empty row button for this TableForm.
     */
    TableForm.prototype.hideAppendEmptyRowBtn = function() {
        this.$addRowBtn.hide();
    };
    
    /**
     * Shows the append empty row button for this TableForm.
     */
    TableForm.prototype.showAppendEmptyRowBtn = function() {
        this.$addRowBtn.show();
    };
    
    /**
     * Sets the row data at the given row number.
     * @param {number} rowNumber The row to set data on.
     * @param {object} data An object representing the data. Keys should 
     *    correspond to field names. Values should correspond
     *    to the value to insert at that field.
     */
    TableForm.prototype.setRowData = function(rowNumber, data) {
        for (var key in data) {
            var formattedKey = key + "_" + rowNumber.toString();
            var field = this.$table.find("#" + formattedKey);
            field.val(data[key]);
            // TODO: Possibly trigger a change event on this field
        }
    };
    
    /**
     * Returns the field for a given row.
     * @param {number} rowNumber The row which contains the field.
     * @param {string} fieldId The ID of the field, as if it were not part
     *     of an TableForm. e.g., if you wanted to find the vendor_id on
     *     the first array row, the actual id would be vendor_id_0. But 
     *     instead you can call this function which will figure out what ID
     *     it is and return it to you.
     */
    TableForm.prototype.getFieldId = function (rowNumber, fieldId) {
        return [fieldId, rowNumber.toString()].join("_");
    }
    
    /**
     * Inserts a row at the specified rowNumber with the specified data.
     * @param {number} rowNumber The row number at which to insert
     * @param {object} data An object representing the data to insert. 
     *    Keys should correspond to field names. Values should correspond
     *    to the value to insert at that field.
     * @returns {boolean} Returns false if the row could not be inserted,
     *     which happens if all rows are already visible. Returns true if
     *     the row was successfully inserted.
     */
    TableForm.prototype.insertFilledRow = function(rowNumber, data) {
        var insertSuccessful = this.insertBlankRow(rowNumber);
        if (!insertSuccessful) {
            return false;
        }
        
        this.setRowData(rowNumber, data);
        return true;
    };
    
    /**
     * Disables the specified fields on the specified row.
     * @param {number} rowNumber The row with the fields to disable.
     * @param {array<string>} fieldNames An array of strings, names which 
     *     should correspond to the field names.
     */
    TableForm.prototype.disableFieldsOnRow = function(rowNumber, fieldNames) {
        for (var i = 0; i < fieldNames.length; i++) {
            var formattedKey = fieldNames[i] + "_" + rowNumber.toString();
            var field = this.rows[rowNumber].$row.find("#" + formattedKey);
            field.attr("readonly", "readonly");
        }
    };
    
    /**
     * Un-disables the specified fields on the specified row.
     * @param {number} rowNumber The row with the fields to un-disable.
     * @param {array<string>} fieldNames An array of strings, names which 
     *     should correspond to the field names.
     */
    TableForm.prototype.unDisableFieldsOnRow = function(rowNumber, fieldNames) {
        for (var i = 0; i < fieldNames.length; i++) {
            var formattedKey = fieldNames[i] + "_" + rowNumber.toString();
            var field = this.rows[rowNumber].$row.find("#" + formattedKey);
            field.removeAttr("readonly");
        }
    };
    
    /**
     * Disable the remove row button on the specified row.
     * @param {number} rowNumber The row with the remove row button to disable.
     */
    TableForm.prototype.disableRemoveRowBtn = function(rowNumber) {
        this.$removeRowBtns[rowNumber].hide();
    };
    
    /**
     * Un-disables the remove row button on the specified row.
     * @param {number} rowNumber The row with the remove row button to enable.
     */
    TableForm.prototype.unDisableRemoveRowBtn = function(rowNumber) {
        this.$removeRowBtns[rowNumber].show();
    };
    
    /**
     * Finds all elements with the 'is-table-form' class and constructs them
     * as TableForm objects. Returns a hash of those composed objects.
     * @returns {object} Returns an hash object of constructed TableForm
     *     objects. Names on the object correspond to the TableForm ID.
     */
    function initialize() {
        var allTables = $('.is-table-form');
        var tableForms = {};
        allTables.each(function(i) {
            var id = $(this).attr('id');
            tableForms[id] = new TableForm(id);
        });
        return tableForms;
    }
    
    var tableForm = {
        /** 
         * Call initialize() to initialize all relevant listeners and do 
         * initial processing (i.e., to hide rows that have nothing in them).
         * 
         * This also returns those TableForm objects if you want to do
         * something special with them.
         */
        initialize: initialize 
    };
    
    return tableForm;
});