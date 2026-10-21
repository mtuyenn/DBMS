package com.hospitality.mis.common;

import com.hospitality.mis.common.exception.DomainException;
import com.hospitality.mis.common.validation.PhoneNumberNormalizer;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PhoneNumberNormalizerTest {
    @Test
    void vietnameseNationalAndInternationalFormsShareOneCanonicalValue() {
        assertThat(PhoneNumberNormalizer.normalize("+84 901-234-567")).isEqualTo("0901234567");
        assertThat(PhoneNumberNormalizer.normalize("0901.234.567")).isEqualTo("0901234567");
    }

    @Test
    void invalidCharactersAreRejected() {
        assertThatThrownBy(() -> PhoneNumberNormalizer.normalize("0901ABC567"))
                .isInstanceOf(DomainException.class)
                .extracting("code").isEqualTo("PHONE_INVALID");
    }
}
